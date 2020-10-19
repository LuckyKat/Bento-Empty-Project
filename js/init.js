/**
 * Initialization of system and cordova modules
 */
bento.define('init', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/tween',
    'bento/eventsystem',
    'utils'
], function (
    Bento,
    Vector2,
    Rectangle,
    Tween,
    EventSystem,
    Utils
) {
    'use strict';
    return function () {

        // init structure
        var initFunctions = {
            /*
             * Set Up Input Safety
             */
            inputSafety: function () {
                EventSystem.on('touchcancel', Bento.input.resetPointers);
            },

            /*
             * Prepare Localization
             */
            initLocalization: function (Localization) {
                // find system language (language is set in preloader screen)
                Localization.init();

                // clean unused language assets (note: this means you cannot change language after startup)
                if (!Bento.isDev()) {
                    Localization.cleanUnusedAssets();
                }
            }
        };
        var initList = {
            inputSafety: {
                require: [],
                priority: 0,
                postPreload: false
            },
            initLocalization: {
                require: ['modules/localization'],
                priority: 0,
                postPreload: true
            }
        };

        // build priority ordered lists
        var prePreloaderInit = {
            require: [],
            order: []
        };
        var postPreloaderInit = {
            require: [],
            order: []
        };
        Object.keys(initList).sort(function (a, b) {
            if (initList[a].priority > initList[b].priority) {
                return 1;
            }
        }).forEach(function (initName) {
            if (initList[initName].postPreload) {
                postPreloaderInit.order.push(initName);
                postPreloaderInit.list = postPreloaderInit.list.concat(initList[initName].require);
            } else {
                prePreloaderInit.order.push(initName);
                prePreloaderInit.list = prePreloaderInit.list.concat(initList[initName].require);
            }
        });

        var initModules = function (orderedModuleList) {
            // priority ordered require
            bento.require(orderedModuleList.require, function () {
                var modules = [];
                // arguments isn'ta real array unless we tell it to be
                for (var i = arguments.length - 1; i >= 0; i--) {
                    modules.push(arguments[i]);
                }
                var currentModuleIndex = 0;

                //run all the initFunctions with their respective modules as arguments
                orderedModuleList.order.forEach(function (initName) {
                    var requiredModules = modules.slice(currentModuleIndex, currentModuleIndex + initList[initName].require.length);
                    initFunctions[initName](...requiredModules);
                });

                //unwatch these modules, we don't want them reloading on soft reloads by developers
                bento.unwatchModules(modules);
            });
        };

        initModules(prePreloaderInit);
        /**
         * Start preloader
         */
        Bento.assets.load('preloader', function (err) {
            initModules(postPreloaderInit);
            Bento.screens.show('screens/preloader');
        });
    };
});