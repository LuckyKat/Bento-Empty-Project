/**
 * An entity that holds and manipulates a mesh
 * @moduleName LuckyKat3d
 */
bento.define('entities/luckykat3d', [
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
    'onigiri/onigiri',
    'onigiri/clickcaster',
    'onigiri/entity3d',
    'onigiri/animationmixer',
    'color'
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
    Onigiri,
    ClickCaster,
    Entity3D,
    AnimationMixer,
    Color
) {
    'use strict';
    return function(settings) {
        // --- Variables ---
        var mesh = Onigiri.getMesh('luckykat');
        var mat = mesh.children[1].material;
        mat.emissive = new THREE.Color(0, 0, 0);

        // --- Components ---
        var yPos = 0;
        var controls = new ClickCaster({
            recursive: false,
            raycastMesh: mesh.children[1],
            pointerDownCast: function(data) {
                if (yPos === 0 && data.castData) {
                    new Tween({
                        from: yPos,
                        to: 1,
                        in: 15,
                        ease: 'easeOutSine',
                        onUpdate: function(v, t) {
                            yPos = v;
                        },
                        onComplete: function() {
                            new Tween({
                                from: yPos,
                                to: 0,
                                in: 15,
                                ease: 'easeInSine',
                                onUpdate: function(v, t) {
                                    yPos = v;
                                },
                                onComplete: function() {
                                    yPos = 0;
                                    new Tween({
                                        from: 0.25,
                                        to: 0,
                                        in: 120,
                                        ease: 'elastic',
                                        decay: 5,
                                        oscillations: 5,
                                        onUpdate: function(v, t) {
                                            mesh.scale.x = 1 + v;
                                            mesh.scale.z = 1 + v;
                                            mesh.scale.y = 1 - v;
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            }
        });

        var animationMixer = new AnimationMixer({
            object3D: mesh,
            playOnStart: ['idle'],
            afterUpdate: function() {
                entity.position.set(0, yPos, 0.5);
            }
        });
        animationMixer.setLoop('idle', true);

        // --- Entity ---
        var entity = new Entity3D({
            name: 'luckyKat3d',
            family: [''],
            object3D: mesh,
            position: new THREE.Vector3(0, 0, 0.5),
            euler: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(1, 1, 1),
            castShadow: true,
            receiveShadow: true,
            components: [
                animationMixer, {
                    name: 'colorBlend',
                    update: function() {
                        mat.color = new Color.hsv((entity.timer * 0.0025) % 1, 0.75, 1).toThree();
                    }
                },
                controls
            ]
        });

        return entity;
    };
});