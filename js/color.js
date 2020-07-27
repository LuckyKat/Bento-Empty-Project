/**
 * Color override that uses an object instead of a array
 * @moduleName Color
   * @snippet Color.black
new Color(0,0,0)
  * @snippet Color.grey
new Color(128,128,128)
  * @snippet Color.white
new Color(255,255,255)
  * @snippet Color.red
new Color(255,0,0)
  * @snippet Color.green
new Color(0,255,0)
  * @snippet Color.blue
new Color(0,0,255)
  * @snippet Color.cyan
new Color(0,255,255)
  * @snippet Color.magenta
new Color(255,0,255)
  * @snippet Color.yellow
new Color(255,255,0)
 */
bento.define('color', ['bento/utils'], function(Utils) {

    var HSVtoRGB = function(h, s, v) {
        var r, g, b, i, f, p, q, t;
        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = v * (1 - s);
        q = v * (1 - f * s);
        t = v * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0:
                r = v;
                g = t;
                b = p;
                break;
            case 1:
                r = q;
                g = v;
                b = p;
                break;
            case 2:
                r = p;
                g = v;
                b = t;
                break;
            case 3:
                r = p;
                g = q;
                b = v;
                break;
            case 4:
                r = t;
                g = p;
                b = v;
                break;
            case 5:
                r = v;
                g = p;
                b = q;
                break;
        }
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    };

    var RGBtoHSV = function(r, g, b) {
        r /= 255, g /= 255, b /= 255;

        var max = Math.max(r, g, b),
            min = Math.min(r, g, b);
        var h, s, v = max;

        var d = max - min;
        s = max === 0 ? 0 : d / max;

        if (max === min) {
            h = 0; // achromatic
        } else {
            switch (max) {
                case r:
                    h = (g - b) / d + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / d + 2;
                    break;
                case b:
                    h = (r - g) / d + 4;
                    break;
            }

            h /= 6;
        }

        return {
            h: h,
            s: s,
            v: v
        };
    };

    var Color = function(r, g, b, a) {
        if (!Utils.isDefined(a)) {
            a = 255;
        }
        return {
            r: Utils.clamp(0, Math.round(r), 255),
            g: Utils.clamp(0, Math.round(g), 255),
            b: Utils.clamp(0, Math.round(b), 255),
            a: Utils.clamp(0, Math.round(a), 255),
            clone: function() {
                return Object.assign({}, this);
            },
            equals: function(otherCol) {
                return (
                    this.r === otherCol.r &&
                    this.g === otherCol.g &&
                    this.b === otherCol.b
                );
            },
            equalsAlpha: function(otherCol) {
                return (
                    this.r === otherCol.r &&
                    this.g === otherCol.g &&
                    this.b === otherCol.b &&
                    this.a === otherCol.a
                );
            },
            toInt: function() {
                return Math.round(this.b) + (Math.round(this.g) << 8) + (Math.round(this.r) << 16);
            },
            toOldColor: function() {
                return [this.r / 255, this.g / 255, this.b / 255, this.a];
            },
            toHex: function() {
                var componentToHex = function(c) {
                    var hex = c.toString(16);
                    return hex.length === 1 ? "0" + hex : hex;
                };
                return "#" + componentToHex(this.r) + componentToHex(this.g) + componentToHex(this.b);
            },
            toHSV: function() {
                return RGBtoHSV(this.r, this.g, this.b);
            },
            toThree: function() {
                return new THREE.Color(this.toInt());
            }
        };
    };
    Color.hsv = function(H, S, V, A) {
        var rgb = HSVtoRGB(H, S, V);
        return new Color(rgb.r, rgb.g, rgb.b, A);
    };
    Color.hex = function(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? new Color(parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 1) : null;
    };

    return Color;
});