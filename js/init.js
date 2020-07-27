/**
 * Initialization of system and cordova modules
 */
bento.define('init', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/tween',
    'bento/eventsystem',
    'utils',
    'modules/localization',
    'onigiri/onigiri'
], function (
    Bento,
    Vector2,
    Rectangle,
    Tween,
    EventSystem,
    Utils,
    Localization,
    Onigiri
) {
    'use strict';
    return function () {
        /**
         * Clears screen with black every tick (android only)
         */
        var clearScreen = function () {
            var canvasDimension = Bento.getViewport();
            var clear = function (data) {
                data.renderer.begin();
                data.renderer.fillRect([0, 0, 0, 1], 0, 0, canvasDimension.width, canvasDimension.height);
                data.renderer.flush();
            };
            if (Utils.isNativeAndroid()) {
                EventSystem.on('preDraw', clear);
            }
        };
        /**
         * Turn off antialiasing for pixel art
         */
        var antiAliasing = function () {
            if (Utils.isCocoonJS() && window.Cocoon) {
                window.Cocoon.Utils.setAntialias(false);
            }
        };
        /**
         * Init localization
         */
        var initLocalization = function () {
            // find system language (language is set in preloader screen)
            Localization.init();

            // clean unused language assets (note: this means you cannot change language after startup)
            if (!Bento.isDev()) {
                Localization.cleanUnusedAssets();
            }
        };

        clearScreen();
        antiAliasing();

        /**
         * Start preloader
         */
        Bento.assets.load('preloader', function (err) {
            initLocalization();

            // enable extensions for onigiri
            Onigiri.setup({
                extensions: [
                    'onigiri/animationmixer',
                    'onigiri/clickcaster',
                    'onigiri/collider',
                    'onigiri/entity3d',
                    'onigiri/light',
                    'onigiri/primitive',
                    'onigiri/trail',
                'onigiri/camera'
                ],
                onComplete: function () {
                    Bento.screens.show('screens/preloader');
                }
            });
        });
    };
});