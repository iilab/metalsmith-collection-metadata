var Matcher = require('minimatch').Minimatch;
var filter = require('deep-filter');
var _ = require('underscore');

/**
 * Sets the given metadata on the file object
 *
 * @param file {Object}
 * @param metadata {Object}
 * @private
 */
function update(target) {
    var sources = [].slice.call(arguments, 1);
    sources.forEach(function (source) {
        Object.keys(source).forEach(function(propName) {
            if (isNaN(propName)) {
                Object.defineProperty(target, propName,
                    Object.getOwnPropertyDescriptor(source, propName));
            }
        });
    });
    return target;
};

function clone(obj, ignoreKeys) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var attr in obj) {
  //          console.log(attr)
  //          console.log(obj)
            copy[attr] = clone(obj[attr], ignoreKeys);
        }

//        for (var i = 0, len = obj.length; i < len; i++) {
//            copy[i] = clone(obj[i], ignoreKeys);
//        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr) && isNaN(attr) && ignoreKeys.indexOf(attr) < 0 ) {
                copy[attr] = clone(obj[attr], ignoreKeys);
            }
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}

/**
 * Sets some metadata on each file depending a pattern
 *
 * @param rules {Array} array of rules to set the metadata, each item of
 * the array should be a literal object containing a `pattern` entry (String)
 * and a `metadata` entry (Object)
 *
 * @return {Function}
 */
module.exports = function (actions) {
    var actions = actions || [];
    return function (files, metalsmith, done) {
        var metadata;
        var key;


        metadata = metalsmith.metadata();

        actions.forEach(function (action_item) {
            var ignoreKeys = action_item.ignore || [];

            metadata.collections[action_item.target] = metadata.collections[action_item.target] || {};
            switch(action_item.action) {
                case "merge":
                    Object.keys(files).forEach(function(file){
                        var data = files[file];

                        data.collection.forEach(function (coll) {
                            card_keys = coll.split(".");
                            if (action_item.source.indexOf(card_keys[0]) >= 0 ) {
//                                console.log(card_keys)
                                lang = card_keys[1];
                                topic = card_keys[2] || null;
                                unit = card_keys[3] || null;
                                switch(data.container) {
                                    case "topic":
                                        metadata.collections[action_item.target][lang] = metadata.collections[action_item.target][lang] || {};
                                        metadata.collections[action_item.target][lang][topic] = metadata.collections[action_item.target][lang][topic] || {};
                                        metadata.collections[action_item.target][lang][topic] = _.extend(metadata.collections[action_item.target][lang][topic], clone(data, ignoreKeys));
                                    break;
                                    case "unit":
                                        metadata.collections[action_item.target][lang] = metadata.collections[action_item.target][lang] || {};
                                        metadata.collections[action_item.target][lang][topic][unit] = metadata.collections[action_item.target][lang][topic][unit] || {};
                                        metadata.collections[action_item.target][lang][topic][unit] = _.extend(metadata.collections[action_item.target][lang][topic][unit], clone(data, ignoreKeys));
                                    break;
                                    case "stack":
                                        metadata.collections[action_item.target][lang] = metadata.collections[action_item.target][lang] || {};
                                        metadata.collections[action_item.target][lang][topic] = metadata.collections[action_item.target][lang][topic] || {};
                                        metadata.collections[action_item.target][lang][topic][unit] = metadata.collections[action_item.target][lang][topic][unit] || {};
                                        metadata.collections[action_item.target][lang][topic][unit][data.paths.name] = metadata.collections[action_item.target][lang][topic][unit][data.paths.name] || {};
//                                        console.log("STACK BEFORE")
//                                        console.log(metadata.collections[action_item.target][lang][topic][unit][data.paths.name])
                                        metadata.collections[action_item.target][lang][topic][unit][data.paths.name] = _.extend(metadata.collections[action_item.target][lang][topic][unit][data.paths.name], clone(data, ignoreKeys));
//                                        console.log("DATA")
//                                        console.log(data)
//                                        console.log("STACK AFTER")
//                                        console.log(metadata.collections[action_item.target][lang][topic][unit][data.paths.name])
                                    break;
                                }
                            }
                        });

                        files[file] = data;
                    });

                break;
                case "up":
                    var source = clone(metadata.collections[action_item.source], ignoreKeys);
                    Object.keys(typeof source != "string"?source:[]).forEach(function(lang) {
                        Object.keys(typeof source[lang] != "string"?source[lang]:[]).forEach(function(topic) {
                            action_item.fields.forEach(function(field) { 
                                source[lang][field] = (field in source[lang]) ? source[lang][field] : [] 
                            });
                            Object.keys(typeof source[lang][topic] != "string"?source[lang][topic]:[]).forEach(function(unit) {
                                action_item.fields.forEach(function(field) { 
                                    source[lang][topic][field] =  (field in source[lang][topic] ) ? source[lang][topic][field] : [] 
                                });
                                Object.keys(typeof source[lang][topic][unit] != "string"?source[lang][topic][unit]:[]).forEach(function(stack) {
                                    action_item.fields.forEach(function(field) { 
                                        source[lang][topic][unit][field] = (field in source[lang][topic][unit] ) ? source[lang][topic][unit][field] : [] 
                                    });
                                    action_item.fields.forEach(function(field) {
                                        var val = source[lang][topic][unit][stack][field];
                                        if (val) {
                                            if (!~source[lang][topic][unit][field].indexOf(val) && val.length > 0 && val != "") {
//                                                console.log(source[lang][topic][unit][field])
//                                                console.log(lang + ":" + topic + ":" + unit + ":" + field)
//                                                console.log(val)
                                                source[lang][topic][unit][field].push(val);
                                            }
                                            if (!~source[lang][topic][field].indexOf(val) && val.length > 0 && val != "") {
//                                                console.log(source[lang][topic][field])
//                                                console.log(lang + ":" + topic + ":" + field)
//                                                console.log(val)
                                                source[lang][topic][field].push(val);
                                            }
                                            if (!~source[lang][field].indexOf(val) && val.length > 0 && val != "") {
                                                source[lang][field].push(val);
                                            }
                                        }
                                    });
                                });
                            });
                        });
                    });
                    metadata.collections[action_item.source] = source;
                break;
            }
        });


//        console.log(Object.keys(metadata.collections.tree.en))
//        console.log(Object.keys(metadata.collections.tree.en["safe-social-networks"]))
//        console.log(metadata.collections.tree)
//        console.log(Object.keys(metadata.collections.tree.en))
//        console.log(metadata.collections.tree.en)
//        console.log(metadata.collections.tree.en["practice-safe-social-networks"]["getting-started"])
        done();
    };
};
