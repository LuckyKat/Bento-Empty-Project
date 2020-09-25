/* globals process */
var Utils = require('./utils');

// fix for EMFILE error, having too many files opened
var os = require('os');
var path = require('path');
var fs = require('fs');
var stream = require('stream');
var gracefulFs = require('graceful-fs');
gracefulFs.gracefulify(fs);

var tap = require('gulp-tap');
var replace = require('gulp-replace');

var gulp = require('gulp');

/**
 * Make errors more readable
 */
var plumber = require('gulp-plumber');
var onError = function (err) {
    console.log(err);
    this.emit('end');
};

/**
 * Wrap object into a file using vinyl
 */
var File = require('vinyl');
var toFile = function (file) {
    var src = new stream.Readable({
        objectMode: true
    });
    src._read = function () {
        this.push(new File(file));
        this.push(null);
    };
    return src;
};
/**
 * Async completion helper
 */
var Completion = function (onComplete) {
    var todo = 0;
    var done = 0;

    return {
        add: function () {
            todo += 1;
        },
        done: function () {
            done += 1;
            if (todo === done) {
                onComplete();
            }
        }
    };
};
/**
 * Delete an entire folder
 * http://stackoverflow.com/a/32197381/5930772
 */
var deleteFolderRecursive = function (source) {
    if (fs.existsSync(source)) {
        fs.readdirSync(source).forEach(function (file, index) {
            var curPath = path.join(source, file);
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(source);
    }
};
/**
 * Extracts name and versions
 */
var getXmlInfo = function () {
    // note: parsing might be better with the etree node module
    var xml;
    var info = {};
    var start, end;
    // read config.xml from root folder
    xml = fs.readFileSync(path.join('config.xml'), 'utf-8');

    // parse name
    if (xml) {
        start = xml.indexOf('<name>');
        end = xml.indexOf('</name>', start + ('<name>').length);
        if (start >= 0 && end >= 0) {
            info.name = xml.substring(start + ('<name>').length, end);
        }

        // parse version
        start = xml.indexOf('version="', xml.indexOf('widget')); // the first line states xml version
        end = xml.indexOf('"', start + ('version="').length);
        if (start >= 0 && end >= 0) {
            info.version = xml.substring(start + ('version="').length, end);
        }

        // parse android build
        start = xml.indexOf('android-versionCode="');
        end = xml.indexOf('"', start + ('android-versionCode="').length);
        if (start >= 0 && end >= 0) {
            info.build = xml.substring(start + ('android-versionCode="').length, end);
        }

        // parse ios build
        start = xml.indexOf('ios-CFBundleVersion="');
        end = xml.indexOf('"', start + ('ios-CFBundleVersion="').length);
        if (start >= 0 && end >= 0) {
            info.buildIos = xml.substring(start + ('ios-CFBundleVersion="').length, end);
        }
    }

    return info;
};

var audioFormats = [
    'assets/**/*.ogg',
    'assets/**/*.mp3',
    'assets/**/*.ac3'
];

/**
 * Gulp tasks
 */
var jsons = {};

function checkWww(done) {
    if (!fs.existsSync(path.join('www'))) {
        fs.mkdirSync(path.join('www'));
    }
    done();
}

function collectLoop() {
    var src = [
        'assets/**/*.json',
        'assets/**/*.png',
        'assets/**/*.otf',
        'assets/**/*.ttf',
        'assets/**/*.atlas',
        'assets/**/*.fbx',
        'assets/**/*.gltf',
        'assets/**/*.bin',
        '!assets/**/*.tmp',
        '!assets/**/*.json.*',
        '!assets/*.json',
        '!assets/**/*.tmx',
        '!assets/**/*.tsx'
    ].concat(audioFormats);
    var cwd = process.cwd();
    var isWin = (os.platform() === 'win32');

    // reset jsons
    jsons = {};

    return gulp.src(src)
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(tap(function (file, t) {
            var filePath = file.path.replace(path.join(cwd, 'assets') + path.sep, '');
            var folders = filePath.split(path.sep);
            var baseName = folders[0];
            var assetName;
            var asset;
            var fileType;
            var collectSimple = function (type, useExtension) {
                asset = filePath.replace(path.join(baseName, type) + path.sep, '');
                fileType = asset.split('.')[1];
                if (!useExtension) {
                    assetName = asset.split('.')[0];
                } else {
                    assetName = asset;
                }

                if (isWin) {
                    asset = asset.replace(/\\/g, '/');
                    assetName = assetName.replace(/\\/g, '/');
                }

                if (type === 'spine3d' && (fileType === 'png' || fileType === 'atlas')) {
                    // png is ignored because texturepacker can create multiple images
                    return;
                }

                json[type] = json[type] || {};
                json[type][assetName] = asset;

                // exception: spritesheets dont need filetype
                if (type === 'spritesheets') {
                    json[type][assetName] = json[type][assetName].replace('.json', '');
                    json[type][assetName] = json[type][assetName].replace('.png', '');
                } else if (type === 'spine3d') {
                    json[type][assetName] = json[type][assetName].replace('.json', '');
                }
            };
            var collectAudio = function () {
                var type = 'audio';
                asset = filePath.replace(path.join(baseName, type) + path.sep, '');
                assetName = asset.split('.')[0];

                if (isWin) {
                    asset = asset.replace(/\\/g, '/');
                    assetName = assetName.replace(/\\/g, '/');
                }

                json[type] = json[type] || {};
                json[type][assetName] = json[type][assetName] || [];
                json[type][assetName].push(asset);
            };
            // add key
            var json = jsons[baseName];
            if (!json) {
                jsons[baseName] = {};
                json = jsons[baseName];
            }

            // path does not include '.': it's not a file
            if (filePath.indexOf('.') === -1) {
                return;
            }

            // type
            if (folders[1] === 'images') {
                collectSimple('images');
            } else if (folders[1] === 'json') {
                collectSimple('json');
            } else if (folders[1] === 'audio') {
                collectAudio();
            } else if (folders[1] === 'fonts') {
                collectSimple('fonts');
            } else if (folders[1] === 'spritesheets') {
                collectSimple('spritesheets');
            } else if (folders[1] === 'spine3d') {
                collectSimple('spine3d');
            } else if (folders[1] === 'fbx') {
                collectSimple('fbx');
            } else if (folders[1] === 'gltf') {
                collectSimple('gltf', true);
            } else {
                // binary?
            }

            // fileName = path.basename(file.path);

        }));
}

function writeAssetsJson() {
    // write out json files
    var json;
    var jsonfile = require('jsonfile');
    var jeditor = require("gulp-json-editor");
    var stringify = require('json-stable-stringify');

    jsons = JSON.parse(stringify(jsons));

    jsonfile.spaces = 4;

    return toFile({
            path: 'fake.json',
            contents: new Buffer(JSON.stringify(jsons))
        })
        .pipe(jeditor(function (file) {
            for (json in jsons) {
                if (jsons.hasOwnProperty(json)) {
                    // add path
                    jsons[json].path = 'assets/' + json + '/';
                    // write file
                    // jsonfile.writeFileSync('assets/' + json + '.json', jsons[json]);
                }
            }
            jsonfile.writeFileSync('assets.json', jsons);

            return file;
        }));
}

function cleanWww() {
    var clean = require('gulp-clean');
    return gulp.src('www/**/*.*', {
            read: false
        }).pipe(plumber({
            errorHandler: onError
        }))
        .pipe(clean({
            force: true
        }));
}

function cleanWeb(callback) {

    // discard unused assets
    deleteFolderRecursive(path.join('www', 'lib'));
    deleteFolderRecursive(path.join('www', 'res'));
    fs.unlinkSync(path.join('www', 'package.json'));
    callback();
}

function cleanInline(done) {
    // cleanup unused resources after being inlined
    deleteFolderRecursive(path.join('www', 'js'));
    deleteFolderRecursive(path.join('www', 'assets'));
    deleteFolderRecursive(path.join('www', 'lib'));
    deleteFolderRecursive(path.join('www', 'res'));
    fs.unlinkSync(path.join('www', 'assets.json'));
    fs.unlinkSync(path.join('www', 'package.json'));
    fs.unlinkSync(path.join('www', 'style.css'));
    done();
}

function copyToWww() {
    var src = [
        'assets/**/*.json',
        'assets/**/*.png',
        'assets/**/*.otf',
        'assets/**/*.ttf',
        'assets/**/*.atlas',
        'assets/**/*.fbx',
        'assets/**/*.gltf',
        'assets/**/*.bin',
        './lib/**/*',
        './index.html',
        './assets.json',
        './style.css',
        './package.json'
    ].concat(audioFormats);

    return gulp.src(src, {
            base: './'
        })
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(gulp.dest('./www'));
}

function oggOnly(done) {
    // for cocoon builds, ogg is enough
    audioFormats = ['assets/**/*.ogg'];
    done();
}

function mp3Only(done) {
    // on mobile safari, mp3 is necessary
    audioFormats = ['assets/**/*.mp3'];
    done();
}

function restoreAudio(done) {
    // restore all audio formats
    audioFormats = [
        'assets/**/*.ogg',
        'assets/**/*.mp3',
        'assets/**/*.ac3'
    ];
    done();
}

function concatJsToWwwGameJs() {
    // concats all js files into www/js/game.js
    var concat = require('gulp-concat');
    return gulp.src([
            'js/**/*.js'
        ])
        // output
        .pipe(concat('game.js'))
        .pipe(gulp.dest('www/js'));
}

function copyJsToWww() {
    // copy without concatting
    return gulp.src([
            'js/**/*.js'
        ])
        .pipe(gulp.dest('www/js'));
}

function replaceInWww() {
    var xmlInfo = getXmlInfo();
    // replace specific strings
    return gulp.src([
            './www/js/**/*.js'
        ], {
            base: './'
        })
        .pipe(replace('BETA_TEST: true', 'BETA_TEST: false'))
        .pipe(replace('DEV_MODE: true', 'DEV_MODE: false'))
        .pipe(replace('DGG_DEMO: true', 'DGG_DEMO: false'))
        .pipe(replace('dev: true', 'dev: false'))
        .pipe(replace(/\/\* remove\:start \*\/([\S+\n\r\s]+?)\/\* remove\:end \*\//g, ''))
        .pipe(replace('/*replace:version*/', 'window.VERSION = "' + xmlInfo.version + '";'))
        .pipe(replace('/*replace:build*/', 'window.BUILD = ' + xmlInfo.build + ';')) // this is android build number
        .pipe(gulp.dest('./'));
}

function replaceWebInWww() {
    // replace specific strings for web build
    return gulp.src([
            './www/js/game.js',
            './www/js/utils.js'
        ], {
            base: './',
            allowEmpty: true
        })
        .pipe(replace('<script type="text/javascript" src="cordova.js"></script>', ''))
        .pipe(replace(/\/\* removeWEB\:start \*\/([\S+\n\r\s]+?)\/\* removeWEB\:end \*\//g, ''))
        .pipe(gulp.dest('./'));
}

function uglifyWww(callback) {
    var pump = require('pump');
    var uglify = require('gulp-uglify-es').default;
    pump([
        gulp.src([
            './www/js/**/*.js'
        ], {
            base: './'
        }),
        uglify(),
        gulp.dest('./')
    ], callback);
}

function packAssets(onComplete) {
    // open assets.json
    var Jimp = require("jimp");
    var imageSize = require('fast-image-size');
    var MaxRectsPacker = require("maxrects-packer");
    var buildPath = 'www';
    var assetsJson = fs.readFileSync(path.join(buildPath, 'assets.json'), 'utf8');
    var spriteSheetJsons = {};
    // prepare for async tasks
    var tasks = new Completion(function () {
        cleanUp();
        onComplete();
    });
    // cleanup: delete the folders of assets that were packed
    var toDelete = [];
    var cleanUp = function () {
        // TODO clean up assets and clean up assets.json
        Utils.forEach(toDelete, function (deletionData) {
            var assetGroupName = deletionData.assetGroupName;
            var type = deletionData.type;

            delete assetsJson[assetGroupName][type];
            deleteFolderRecursive(path.join(buildPath, 'assets', assetGroupName, type));
        });
        // write new asstes json 
        fs.writeFileSync(path.join(buildPath, 'assets.json'), JSON.stringify(assetsJson));
    };
    // pack the images folder
    var packImages = function (assetGroup, assetGroupName, type) {
        var basePath = assetGroup.path;
        var images = assetGroup[type];

        var packer = new MaxRectsPacker(2048, 2048, 1, {
            smart: true,
            pot: false,
            square: false
        });
        var input = [];
        var jimpImages = {};

        var compositePack = function () {
            Utils.forEach(packer.bins, function (bin, i) {
                // new image for each bin
                tasks.add();
                new Jimp(bin.width, bin.height, function (err, image) {
                    Utils.forEach(bin.rects, function (rect) {
                        // paste the image according to the rect
                        var x = rect.x;
                        var y = rect.y;
                        // var width = rect.width;
                        // var height = rect.height;
                        var data = rect.data;
                        var subImage = jimpImages[data.imagePath];
                        image.composite(subImage, x, y);

                        // replace data part
                        delete rect.data;
                        rect.assetName = data.assetName;

                        if (type === 'spritesheets') {
                            rect.spriteSheet = data.spriteSheet;
                        }
                    });
                    var outputDir = path.join(buildPath, 'assets', assetGroupName, 'packed-' + type);
                    var outputJson = bin.rects;
                    image.write(path.join(outputDir, assetGroupName + '-' + i + '.png'), function () {
                        // write the json data
                        fs.writeFileSync(path.join(outputDir, assetGroupName + '-' + i + '.json'), JSON.stringify(outputJson));

                        // add asset to assets.json
                        assetsJson[assetGroupName]['packed-' + type] = assetsJson[assetGroupName]['packed-' + type] || {};
                        assetsJson[assetGroupName]['packed-' + type][assetGroupName + '-' + i] = assetGroupName + '-' + i;

                        tasks.done();
                    });
                });
            });
        };

        if (!images) {
            return;
        }
        // loop through images
        Utils.forEach(images, function (imagePath, assetName) {
            var imageUrl = path.join(buildPath, basePath, type, imagePath);

            // should end with .png
            if (imageUrl.indexOf('.png') < 0) {
                imageUrl += '.png';
            }

            // inspect the size of the image first
            var sizeData = imageSize(imageUrl);
            var inputData = {
                imagePath: sizeData.image, // used to identify the jimp image
                assetName: assetName // used for the rects output json
            };
            // add the rectangle
            input.push({
                width: sizeData.width,
                height: sizeData.height,
                data: inputData
            });
            // add spritesheet data
            if (type === 'spritesheets') {
                inputData.spriteSheet = spriteSheetJsons[assetName];
            }
            // load the image with jimp
            tasks.add();
            Jimp.read(imageUrl, function (err, image) {
                if (err) {
                    throw err;
                }
                // save the 
                jimpImages[imageUrl] = image;

                // async loaded all images
                if (Utils.getKeyLength(jimpImages) === Utils.getKeyLength(images)) {
                    compositePack();
                }
                tasks.done();
            });
        });
        packer.addArray(input);
        toDelete.push({
            assetGroupName: assetGroupName,
            type: type
        });
    };
    var packJson = function (assetGroup, assetGroupName) {
        // var basePath = assetGroup.path;
        var assetJsons = assetGroup.json;
        var outputJson = {};

        if (!assetJsons) {
            return;
        }

        // loop through json files
        Utils.forEach(assetJsons, function (jsonPath, assetName) {
            // load that json
            var json = fs.readFileSync(path.join(buildPath, 'assets', assetGroupName, 'json', jsonPath), 'utf8');
            outputJson[assetName] = JSON.parse(json);
        });
        // write
        var dir = path.join(buildPath, 'assets', assetGroupName, 'packed-json');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        fs.writeFileSync(path.join(dir, assetGroupName + '.json'), JSON.stringify(outputJson));

        // add to assets.json
        var group = {};
        group[assetGroupName] = assetGroupName + '.json';
        assetsJson[assetGroupName]['packed-json'] = group;

        // delete old json files
        toDelete.push({
            assetGroupName: assetGroupName,
            type: 'json'
        });
    };
    var packSpriteSheetFull = function (assetGroup, assetGroupName) {
        // var basePath = assetGroup.path;
        var spritesheets = assetGroup.spritesheets;

        if (!spritesheets) {
            return;
        }
        // collect spritesheet json
        Utils.forEach(spritesheets, function (assetPath, assetName) {
            // load that json
            var json = fs.readFileSync(path.join(buildPath, 'assets', assetGroupName, 'spritesheets', assetPath + '.json'), 'utf8');
            if (spriteSheetJsons[assetName]) {
                console.log("WARNING: asset name used twice: " + assetName);
            }
            spriteSheetJsons[assetName] = JSON.parse(json);
        });
        packImages(assetGroup, assetGroupName, 'spritesheets');
    };
    // TODO
    /*var packSpriteSheetFolder = function (assetGroup, assetGroupName) {
        var basePath = assetGroup.path;
        var spriteSheets = assetGroup.spritesheets;
        var folders = {};

        if (!spriteSheets) {
            return;
        }
        // collect the folders first
        Utils.forEach(spriteSheets, function (spriteSheetPath, spriteSheetName) {
            var tokens = spriteSheetName.split('/');
            if (tokens.length === 1) {
                // root
                folders['.'] = folders['.'] || {};
                folders['.'][spriteSheetPath] = spriteSheetName;
            } else {
                folders[tokens[0]] = folders[tokens[0]] || {};
                folders[tokens[0]][spriteSheetPath] = spriteSheetName;
            }
        });

        // loop through folders and create packs
        Utils.forEach(folders, function (folder, folderName) {
            
        });
    };*/
    // parse json after reading
    assetsJson = JSON.parse(assetsJson);

    Utils.forEach(assetsJson, function (assetGroup, assetGroupName) {
        tasks.add();
        // read settings.json
        var settingsJson = fs.readFileSync(path.join(buildPath, 'assets', assetGroupName, 'settings.json'), 'utf8');
        settingsJson = JSON.parse(settingsJson);

        if (settingsJson.packImages) {
            packImages(assetGroup, assetGroupName, 'images');
        }
        if (settingsJson.packJson) {
            packJson(assetGroup, assetGroupName);
        }
        if (settingsJson.packSpriteSheets === 'full') {
            packSpriteSheetFull(assetGroup, assetGroupName);
        }
    });

    Utils.forEach(assetsJson, function (assetGroup, assetGroupName) {
        tasks.done();
    });
}

function compressJsonInWww(onComplete) {
    // enumerate
    var lzString = require('lz-string');
    var walkSync = function (currentDirPath, callback) {
        fs.readdir(currentDirPath, function (err, files) {
            if (err) {
                throw new Error(err);
            }
            files.forEach(function (name) {
                var filePath = path.join(currentDirPath, name);
                var stat = fs.statSync(filePath);
                var ext = path.extname(name);
                if (stat.isFile() && ext === '.json') {
                    callback(filePath, stat);
                } else if (stat.isDirectory()) {
                    walkSync(filePath, callback);
                }
            });
        });
    };
    walkSync(path.join('www'), function (filePath) {
        var json = fs.readFileSync(filePath, 'utf8');
        var compressed = lzString.compressToBase64(json);
        fs.writeFileSync(filePath, 'LZS' + compressed);
    });
    onComplete();
}

function jsHint() {
    var jshint = require('gulp-jshint');
    // place code for your default task here
    return gulp.src(['js/**/*.js', '!js/lib/*.js'])
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(jshint({
            newcap: false
        }))
        .pipe(jshint.reporter());
}

function inlineAssets(callback) {
    var mimer = require('mimer');
    var lzString = require('lz-string');
    // read assets from assets.json
    var buildPath = 'www';
    var assetsJsonStr = fs.readFileSync(path.join(buildPath, 'assets.json'), 'utf8');
    var isCompressed = false;
    var assetsJsonDec;
    var assetsJson;
    // trim header
    if (assetsJsonStr[0] === 'L' && assetsJsonStr[1] === 'Z' && assetsJsonStr[2] === 'S') {
        isCompressed = true;
        // trim header
        assetsJsonStr = assetsJsonStr.substring(3);
    }

    // decompress assetsjson and parse
    if (isCompressed) {
        assetsJsonDec = lzString.decompressFromBase64(assetsJsonStr);
        assetsJson = JSON.parse(assetsJsonDec);
    } else {
        assetsJson = JSON.parse(assetsJsonStr);
    }

    // loop through asset groups
    Utils.forEach(assetsJson, function (assetGroup, assetGroupName) {
        var groupPath = assetGroup.path;
        assetGroup.path = 'base64'; // remove path and indicate base64 assets

        // loop inside asset groups
        Utils.forEach(assetGroup, function (assets, assetType) {
            if (assets === assetGroup.path) {
                // ignore the path key
                return;
            }

            // asset items may be paths or array of paths
            Utils.forEach(assets, function (assetData, assetKey) {
                var findFile = function (assetPath) {
                    var fullPath = path.join(buildPath, groupPath, assetType, assetPath);
                    var fullPathJson = fullPath + '.json';
                    var fullPathPng = fullPath + '.png';
                    var fullPathAtlas = fullPath + '.atlas';

                    if (fs.existsSync(fullPath)) {
                        assetToBase64(fullPath);
                    } else {
                        if (assetType === 'spine3d' && fs.existsSync(fullPathJson) && fs.existsSync(fullPathAtlas)) {
                            // spine consists of 2 main assets and an unknown amount of images
                            assetToBase64(fullPathJson, fullPathAtlas, assetType, assetPath);
                        } else if (fs.existsSync(fullPathJson) && fs.existsSync(fullPathPng)) {
                            // the path may be missing .png or .json at the end (spritesheets & packed-images)
                            assetToBase64(fullPathJson, fullPathPng);
                        } else {
                            // ???
                        }
                    }
                };
                var assetToBase64 = function (filePath1, filePath2, type) {
                    var file1;
                    var file2;
                    var atlas, lines;
                    if (type === 'spine3d' && filePath1 && filePath2) {
                        // convert both, assume 1 is json, 2 is png, 3 is atlas
                        file1 = convertToBase64DataUrl(filePath1);
                        file2 = convertToBase64DataUrl(filePath2);
                        assets[assetKey] = {
                            json: file1,
                            atlas: file2,
                            images: {}
                        };
                        // the images are unknown, we need to parse the atlas file and search through it
                        atlas = fs.readFileSync(filePath2, 'utf-8');
                        // read it line by line
                        lines = atlas.split(/\r\n|\r|\n/);
                        Utils.forEach(lines, function (line, i, l, breakLoop) {
                            var imagePath;
                            if (line.endsWith('png')) {
                                // find the image path
                                // we assume the image is always next to the json or atlas file
                                var directory = path.dirname(filePath1);
                                imagePath = path.join(directory, line);
                                // load file and compress
                                assets[assetKey].images[line] = convertToBase64DataUrl(imagePath);
                            }
                        });

                    } else if (filePath1 && filePath2) {
                        // assume spritesheet
                        // convert both, assume 1 is json, 2 is png
                        file1 = convertToBase64DataUrl(filePath1);
                        file2 = convertToBase64DataUrl(filePath2);
                        assets[assetKey] = {
                            json: file1,
                            png: file2
                        };
                    } else {
                        assets[assetKey] = convertToBase64DataUrl(filePath1);
                    }

                };
                var convertToBase64DataUrl = function (filePath) {
                    // load file and re-save as base64
                    var file = fs.readFileSync(filePath);

                    // JSON files might lose information if base64 conversion is used
                    if (filePath.endsWith('.json')) {
                        if (file[0] === 76 && file[1] === 90 && file[2] === 83) {
                            // already base64 compressed lz-string, return as string
                            return fs.readFileSync(filePath, 'utf-8');
                        } else {
                            // compress with lz string
                            return 'LZS' + lzString.compressToBase64(fs.readFileSync(filePath, 'utf-8'));
                        }
                    }


                    // convert binary data to base64 encoded string
                    var base64 = new Buffer(file).toString('base64');
                    var mediaType = mimer(filePath);
                    var dataUrl = 'data:' + mediaType + ';base64,' + base64;
                    return dataUrl;
                };
                // load assets and resave as base64
                if (Array.isArray(assetData) && assetData.length > 0) {
                    // audio is split as array of paths
                    // since it's pointless to convert all types, we convert only the first
                    findFile(assetData[0]);
                    return;
                } else {
                    // assume assetData is the path
                    findFile(assetData);
                }
            });
        });
    });
    // console.log(JSON.stringify(assetsJson, null, 2))
    // create assets.js to save as inline assets
    fs.writeFileSync(path.join(buildPath, 'js', 'assets.js'), 'window.assetsJson = ' + JSON.stringify(assetsJson) + ';');
    // fs.writeFileSync(path.join(buildPath, 'assets64.json'), JSON.stringify(assetsJson));
    callback();
}

function includeAssetsJsInWwwHtml() {
    return gulp.src([
            './www/index.html'
        ], {
            base: './'
        })
        .pipe(plumber({
            errorHandler: onError
        }))
        // simple replacement of cordova.js with assets.js
        .pipe(replace('<script type="text/javascript" src="cordova.js"></script>', '<script src="js/assets.js"></script>'))
        .pipe(replace('<script src="cordova.js"></script>', '<script src="js/assets.js"></script>'))
        .pipe(gulp.dest('./'));
}

function inlineIntoIndexHtml() {
    var inline = require('gulp-inline');

    return gulp.src([
            './www/index.html'
        ], {
            base: './'
        })
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(inline())
        .pipe(gulp.dest('./'));
}

function audioOptimizationWeb() {
    var exec = require('child_process').exec;
    // strong compression, loses quality significantly, applies to mp3
    var quality = '-q:a 8 -ar 22050';
    return gulp.src('assets/**/*.mp3')
        .pipe(tap(function (file) {
            var command = '';
            // take original assets as input
            var input = file.path.slice(file.path.indexOf('assets/'));
            var output = 'www/' + input;

            command = 'ffmpeg -i ';
            command += input + ' ' + quality + ' -y ' + output;

            // logging is turned off because it pushes out everything else in the terminal
            exec(command); //,function(err,stdout,stderr){console.log(stdout);console.log(stderr);});
        }));
}

function audioOptimizationOgg() {
    // slight compression
    var exec = require('child_process').exec;
    var quality = '-q:a 5';
    return gulp.src('assets/**/*.ogg')
        .pipe(tap(function (file) {
            var command = '';

            // take original assets as input
            var input = file.path.slice(file.path.indexOf('assets/'));
            var output = 'www/' + input;

            command = 'ffmpeg -i ';
            command += input + ' ' + quality + ' -y ' + output;

            // logging is turned off because it pushes out everything else in the terminal
            exec(command); //,function(err,stdout,stderr){console.log(stdout);console.log(stderr);});
        }));
}

function imageMin(callback) {
    var imagemin = require('gulp-imagemin');
    var cache = require('gulp-cache');
    return gulp.src([
            './www/assets/**/*.png'
        ], {
            base: './'
        })
        .pipe(cache(
            imagemin(), {
                name: 'imagemin'
            }
        ))
        .pipe(gulp.dest('./'));
}

function useminWww() {
    var usemin = require('gulp-usemin');

    return gulp.src(['www/index.html'], {
            base: './www'
        })
        .pipe(plumber({
            errorHandler: onError
        }))
        .pipe(usemin({
            js: []
        }))
        .pipe(gulp.dest('./www'));
}

function buildZip() {
    var zip = require('gulp-zip');
    if (!fs.existsSync(path.join('build'))) {
        fs.mkdirSync(path.join('build'));
    }

    return gulp.src(['www/**/*.*'], {
            base: './www'
        })
        .pipe(zip('build.zip'))
        // note: still puts this in build/build.zip and not www/build.zip
        .pipe(gulp.dest(path.join('.', 'build')));
}

function clearCache() {
    var cache = require('gulp-cache');
    cache.clearAll();
}


// descriptions
checkWww.description = "Check if /www exists and makes it";
collectLoop.description = "Loops through available assets";
copyToWww.description = "Copies all files and assets to the www folder";
cleanWww.description = "Cleans the www folder";
cleanWeb.description = "Cleans some files after concatenation from the www for web builds";
cleanInline.description = "Clean up www after inlining everything";
oggOnly.description = "Ignores all audio formats except ogg, ready to be collected";
mp3Only.description = "Ignores all audio formats except mp3, ready to be collected";
restoreAudio.description = "Reverts all audio formats, ready to be collected";
concatJsToWwwGameJs.description = "Concat js files into www/js/game.js";
copyJsToWww.description = "Copy js files to www/js without concatting";
replaceInWww.description = "Replaces several strings in the www folder, such as dev mode and version numbers";
replaceWebInWww.description = "Replaces several strings in the www folder for web build";
uglifyWww.description = "Uglify all js files in www";
packAssets.description = "Minify assets (create texture pages of images and spritesheets, concat json files)";
compressJsonInWww.description = "Find and compress all json files in www, using LZ-string";
jsHint.description = "Run JSHint through all js files (not the ones in lib)";
inlineAssets.description = "Turns all assets into base64 strings and store them into www/assets.js";
includeAssetsJsInWwwHtml.description = "Includes www/assets.js into www/index.html";
inlineIntoIndexHtml.description = "Inlines all external src tags into www/index.html";
audioOptimizationWeb.description = "Strong compression to all mp3 files";
audioOptimizationOgg.description = "Slight compression to all ogg files";
useminWww.description = "Applies usemin to www/index.html";
imageMin.description = "Run imagemin compression on all png files (works best on pixelart)";
buildZip.description = "Creates a zip of www and stores it in build/build.zip";
clearCache.description = "Clears cache in gulp-cache";

gulp.task('checkWww', checkWww);
gulp.task('collectLoop', collectLoop);
gulp.task('collect-assets', gulp.series('collectLoop', writeAssetsJson));
gulp.task('collector', gulp.series('collectLoop', 'collect-assets', function () {
    gulp.watch([
        'assets/**/*',
        '!assets/**/*.tmp',
        '!assets/*.json',
        '!assets/**/*.json.*',
        '!assets/**/*.tmx'
    ], {
        // see https://github.com/gulpjs/gulp/blob/master/docs/api/watch.md
        events: ['add', 'unlink']
    }, gulp.series('collect-assets'));
}));
gulp.task('runNw', function (callback) {
    var exec = require('child_process').exec;
    exec('nw ./', {}, function (error, stdout, stderr) {});
});
gulp.task('jsHint', jsHint);
// build steps
gulp.task('clean', cleanWww);
gulp.task('cleanWeb', cleanWeb);
gulp.task('cleanInline', cleanInline);
gulp.task('copy', copyToWww);
gulp.task('ogg-only', oggOnly);
gulp.task('mp3-only', mp3Only);
gulp.task('restore-audio', restoreAudio);
gulp.task('concat', concatJsToWwwGameJs);
gulp.task('copyJs', copyJsToWww);
gulp.task('replace', replaceInWww);
gulp.task('replaceWeb', replaceWebInWww);
gulp.task('uglify', uglifyWww);
gulp.task('usemin', useminWww);
gulp.task('packAssets', packAssets);
gulp.task('compressJson', compressJsonInWww);
gulp.task('audio-optimization-web', audioOptimizationWeb);
gulp.task('audio-optimization-ogg', audioOptimizationOgg);
gulp.task('imageMin', imageMin);
gulp.task('inline-assets', inlineAssets);
gulp.task('add-assets-js', includeAssetsJsInWwwHtml);
gulp.task('inline-html', inlineIntoIndexHtml);
gulp.task('buildZip', buildZip);
gulp.task('clear-cache', clearCache);