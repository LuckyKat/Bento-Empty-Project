/**
 * Module description
 * @moduleName Camera360
 * @snippet Camera360.snippet
Camera360({
    position: new Vector2(0, 0)
})
 */
bento.define('entities/camera360', [
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
    'bento/tween',
    'onigiri/onigiri'
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
    Tween,
    Onigiri
) {
    'use strict';
    return function(settings) {
        var TwoPi = Math.PI * 2;
        var angle = 0;
        var rotationRate = settings.rotationRate || 0.015;
        var center = new THREE.Vector3(0, 1, 0.7);
        var orbitRadius = 12;
        var behavior = {
            name: 'behaviorComponent',
            update: function(data) {
                // update position, rotate around target
                angle += rotationRate * data.speed;
                angle = angle % TwoPi;
                Onigiri.camera.position.x = center.x + Math.sin(angle) * orbitRadius;
                Onigiri.camera.position.y = center.y + 3;
                Onigiri.camera.position.z = center.z + Math.cos(angle) * orbitRadius;

                // look at target
                var m4 = new THREE.Matrix4().lookAt(Onigiri.camera.position, center, new THREE.Vector3(0, 1, 0));
                var qt = new THREE.Quaternion().setFromRotationMatrix(m4);
                Onigiri.camera.rotation.setFromQuaternion(qt);
            }
        };
        var entity = new Entity({
            name: 'camera360',
            components: [
                behavior
            ]
        });
        return entity;
    };
});