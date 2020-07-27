/**
 * Main screen
 */
bento.define('screens/main', [
    'bento',
    'bento/math/vector2',
    'bento/math/rectangle',
    'bento/components/sprite',
    'bento/components/clickable',
    'bento/entity',
    'bento/eventsystem',
    'bento/gui/clickbutton',
    'bento/gui/counter',
    'bento/gui/text',
    'bento/utils',
    'bento/screen',
    'bento/tween',
    'entities/luckykatlogo',
    'globals',
    'entities/luckykat3d',
    'components/sun',
    'entities/camera360',
    'onigiri/onigiri',
    'onigiri/primitive'
], function(
    Bento,
    Vector2,
    Rectangle,
    Sprite,
    Clickable,
    Entity,
    EventSystem,
    ClickButton,
    Counter,
    Text,
    Utils,
    Screen,
    Tween,
    LuckyKat,
    Globals,
    LuckyKat3d,
    Sun,
    Camera360,
    Onigiri,
    Primitive
) {
    'use strict';
    var onShow = function() {
        // --- Start Onigiri ---
        var onigiri = new Onigiri({
            backgroundColor: '#d8f0f6',
            camera: new Onigiri.Camera({
                style: 'perspective', // or orthographic
                perspectiveFieldOfView: 45,
                orthographicSize: 15,
                nearClippingPlane: 0.1,
                farClippingPlane: 1000,
                autoModifyFieldOfView: true //if kept true, the field of view will be modified based on the screenratio (taller screens get a higher FoV).
            }),
            shadows: true
        });
        Bento.objects.attach(onigiri);

        // --- Some Lighting ---
        var sun = new Sun({
            color: '#ffffff',
            directionalIntensity: 0.2,
            ambientIntensity: 0.8,
            position: new THREE.Vector3(5, 10, 5),
            castShadow: true
        });
        Bento.objects.attach(sun);

        // --- Infinite Floor Plane ---
        var floorTex = Onigiri.getTexture('grid');
        floorTex.wrapS = THREE.RepeatWrapping;
        floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(100, 100);
        var floor = new Primitive({
            shape: 'plane',
            position: new THREE.Vector3(0, 0, 0),
            euler: new THREE.Euler(-Math.PI * 0.5, 0, 0),
            material: new THREE.MeshPhongMaterial({
                map: floorTex,
                color: 0xe0f9ff,
                shininess: 100,
                side: THREE.FrontSide,
                blending: THREE.NormalBlending
            }),
            parameters: [
                1000,
                1000
            ],
            receiveShadow: true,
        });
        Bento.objects.attach(floor);

        // --- Da Lucky Kat ---
        var luckyKat3d = LuckyKat3d({});
        Bento.objects.attach(luckyKat3d);

        // --- Camera ---
        var camera360 = new Camera360({
            target: luckyKat3d.object3D
        });
        Bento.objects.attach(camera360);
    };

    return new Screen({
        onShow: onShow
    });
});