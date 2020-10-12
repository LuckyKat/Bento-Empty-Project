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
        /**
         * Input safety
         */
        var inputSafety = function () {
            EventSystem.on('touchcancel', Bento.input.resetPointers);
        };

        inputSafety();

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