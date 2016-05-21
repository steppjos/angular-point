"use strict";
var uniqueCount = 0;
var fieldTypes = getFieldTypes();
exports.fieldTypes = fieldTypes;
/**
 * @ngdoc service
 * @name angularPoint.apFieldService
 * @description
 * Handles the mapping of the various types of fields used within a SharePoint list
 */
/**
 * @ngdoc function
 * @name angularPoint.apFieldService:getDefaultValueForType
 * @methodOf angularPoint.apFieldService
 * @description
 * Returns the empty value expected for a field type
 * @param {string} fieldType Type of field.
 * @returns {*} Default value based on field type.
 */
function getDefaultValueForType(fieldType) {
    var fieldDefinition = getDefinition(fieldType), defaultValue;
    if (fieldDefinition) {
        defaultValue = fieldDefinition.defaultValue;
    }
    return defaultValue;
}
exports.getDefaultValueForType = getDefaultValueForType;
/**
 * Returns an object defining a specific field type
 * @param {string} fieldType
 * @returns {object} fieldTypeDefinition
 */
function getDefinition(fieldType) {
    return fieldTypes[fieldType] ? fieldTypes[fieldType] : fieldTypes['Text'];
}
exports.getDefinition = getDefinition;
/**
 * @ngdoc function
 * @name angularPoint.apFieldService:getMockData
 * @methodOf angularPoint.apFieldService
 * @description
 * Can return mock data appropriate for the field type, by default it dynamically generates data but
 * the staticValue param will instead return a hard coded type specific value
 *
 * @requires ChanceJS to produce dynamic data.
 * https://github.com/victorquinn/chancejs
 * @param {string} fieldType Field type from the field definition.
 * @param {object} [options] Optional params.
 * @param {boolean} [options.staticValue=false] Default to dynamically build mock data.
 * @returns {*} mockData
 */
// function getMockData(fieldType, options) {
//     let mock;
//     let fieldDefinition = getDefinition(fieldType);
//     if (fieldDefinition) {
//         if (isFunction(chance) && options && !options.staticValue) {
//             /** Return dynamic data if ChanceJS is available and flag isn't set requiring static data */
//             mock = fieldDefinition.dynamicMock(options);
//         } else {
//             /** Return static data if the flag is set or ChanceJS isn't available */
//             mock = fieldDefinition.staticMock;
//         }
//     }
//     return mock;
// }
/**
 * @ngdoc function
 * @name angularPoint.apFieldService:mockPermMask
 * @methodOf angularPoint.apFieldService
 * @description
 * Defaults to a full mask but allows simulation of each of main permission levels
 * @param {object} [options] Options container.
 * @param {string} [options.permissionLevel=FullMask] Optional mask.
 * @returns {string} Values for mask.
 */
// function mockPermMask(options?: { permissionLevel: string }) {
//     let mask = 'FullMask';
//     if (options && options.permissionLevel) {
//         mask = options.permissionLevel;
//     }
//     return resolveValueForEffectivePermMask(mask);
// }
/**
 * @ngdoc function
 * @name angularPoint.apFieldService:resolveValueForEffectivePermMask
 * @methodOf angularPoint.apFieldService
 * @description
 * Takes the name of a permission mask and returns a permission value which can then be used
 * to generate a permission object using modelService.resolvePermissions(outputfromthis)
 * @param {string} perMask Options:
 *  - AddListItems
 *  - EditListItems
 *  - DeleteListItems
 *  - ApproveItems
 *  - FullMask
 *  - ViewListItems
 * @returns {string} value
 */
function resolveValueForEffectivePermMask(perMask) {
    var permissionValue;
    switch (perMask) {
        case 'AddListItems':
            permissionValue = 0x0000000000000002;
            break;
        case 'EditListItems':
            permissionValue = 0x0000000000000004;
            break;
        case 'DeleteListItems':
            permissionValue = 0x0000000000000008;
            break;
        case 'ApproveItems':
            permissionValue = 0x0000000000000010;
            break;
        case 'FullMask':
            permissionValue = 0x7FFFFFFFFFFFFFFF;
            break;
        case 'ViewListItems':
        default:
            permissionValue = 0x0000000000000001;
            break;
    }
    return permissionValue;
}
exports.resolveValueForEffectivePermMask = resolveValueForEffectivePermMask;
/********************PRIVATE FUNCTIONS**********************/
function getFieldTypes() {
    return {
        Text: {
            defaultValue: '',
        },
        Note: {
            defaultValue: '',
        },
        Boolean: {
            defaultValue: null,
        },
        Calculated: {
            defaultValue: null,
        },
        Choice: {
            defaultValue: '',
        },
        Counter: {
            defaultValue: null,
        },
        Currency: {
            defaultValue: null,
        },
        DateTime: {
            defaultValue: null,
        },
        Integer: {
            defaultValue: null,
        },
        JSON: {
            defaultValue: '',
        },
        Lookup: {
            defaultValue: '',
        },
        LookupMulti: {
            defaultValue: [],
        },
        Mask: {
            defaultValue: '',
        },
        Attachments: {
            defaultValue: [],
        },
        MultiChoice: {
            defaultValue: [],
        },
        User: {
            defaultValue: '',
        },
        UserMulti: {
            defaultValue: [],
        }
    };
}
// function getUniqueCounter() {
//     uniqueCount++;
//     return uniqueCount;
// }
// function randomAttachments() {
//     return chance.url({ extensions: ['gif', 'jpg', 'png', 'docx'] });
// }
// function randomBoolean() {
//     return chance.bool();
// }
// function randomCalc() {
//     return 'float;#' + chance.floating({min: 0, max: 10000});
// }
// function randomString() {
//     return chance.word() + ' ' + chance.word();
// }
// function randomStringArray() {
//     let randomArr = [];
//     /** Create a random (1-4) number of strings and add to array */
//     times(random(1, 4), function () {
//         randomArr.push(randomString());
//     });
//     return randomArr;
// }
// function randomParagraph() {
//     return chance.paragraph();
// }
// function randomCurrency() {
//     let min = 100;
//     let max = 1000000000;
//     /** Return a currency value with two decimal places */
//     return (Math.floor(Math.random() * (max - min)) + min) / 100;
// }
// function randomDate() {
//     return chance.date();
// }
// function randomInteger() {
//     return chance.integer();
// }
// function randomLookup() {
//     return {
//         lookupId: getUniqueCounter(),
//         lookupValue: chance.word()
//     };
// }
// function randomUser() {
//     return {
//         lookupId: getUniqueCounter(),
//         lookupValue: chance.name()
//     };
// }
// function randomLookupMulti() {
//     let mockData = [];
//     each(random(10), function () {
//         mockData.push(randomLookup());
//     });
//     return mockData;
// }
// function randomUserMulti() {
//     let mockData = [];
//     each(random(10), function () {
//         mockData.push(randomUser());
//     });
//     return mockData;
// }
//# sourceMappingURL=field.service.js.map