var gulp = require('gulp');

// include the subset fonts tasks
require('./subsetfonts');
require('./subtasks');
require('./generate-icons');

/**
 * Generic build, suitable for Cordova (not Cocoon), usable on Web but build-web is preferred as Web deployment
 */
gulp.task('build',
    gulp.series(
        'checkWww',
        'mp3-only',
        'collect-assets',
        'clean',
        'copy',
        'copyJs',
        'replace',
        'subset',
        'packAssets',
        // 'imageMin',
        'compressJson',
        // restore audio
        'restore-audio',
        'collect-assets'
    )
);
gulp.task('build-web',
    gulp.series(
        'checkWww',
        'mp3-only',
        'collect-assets',
        'clean',
        'copy',
        'concat',
        'replace',
        'subset',
        'audio-optimization-web',
        'packAssets',
        // 'imageMin',
        'compressJson',
        'replaceWeb',
        'usemin',
        'uglify',

        // restore audio
        'restore-audio',
        'collect-assets'
    )
);

gulp.task('build-compact',
    gulp.series(
        'checkWww',
        'build-web',
        'inline-assets',
        'add-assets-js',
        'inline-html',
        'cleanInline'
    )
);
gulp.task('build-cocoonjs', gulp.series(
    'checkWww',
    'ogg-only',
    'collect-assets',
    'clean',
    'copy',
    'copyJs',
    'replace',
    'packAssets',
    'compressJson',
    'restore-audio',
    'collect-assets',
    'buildZip'
));
gulp.task('watch', gulp.series('build', function () {
    gulp.watch([
        'js/**/*.js',
        'assets/**/*',
        '!assets/*.json',
        'index.html',
        'lib/**/*.js'
    ], {
        interval: 1000
    }, gulp.series('build'));
}));


gulp.task('build-desktop', gulp.series(
    'checkWww',
    'ogg-only', // mp3 for windows?
    'build-web',
    'restore-audio',
    function (done) {
        var NwBuilder = require('nw-builder');
        var nw = new NwBuilder({
            files: './www/**/**', // use the glob format
            platforms: ['osx64' /*, 'win32', 'win64'*/ ],
            buildDir: './app',
            macIcns: 'misc/icon.icns',
            version: '0.19.2',
            flavor: 'normal'
        });
        nw.build().then(done).catch(function (error) {
            console.error(error);
            done();
        });
    }));