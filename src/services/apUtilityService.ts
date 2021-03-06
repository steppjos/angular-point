import * as _ from 'lodash';
// Split values like 1;#value into id and value
import {IUserPermissionsObject} from '../constants/apPermissionObject';

export class SplitIndex {
    id: number;
    value: string;

    constructor(str) {
        const spl = str.split(';#');
        this.id = parseInt(spl[0], 10);
        this.value = spl[1];
    }
}

/**
 * @ngdoc service
 * @name angularPoint.apUtilityService
 * @description
 * Provides shared utility functionality across the application.
 *
 * @requires angularPoint.apConfig
 */
export class UtilityService {
    static $inject = ['$q', '$timeout'];
    SplitIndex = SplitIndex;
    isGuid = isGuid;
    constructor(private $q, private $timeout) { }

    /**
     * @ngdoc function
     * @name angularPoint.apUtilityService:batchProcess
     * @methodOf angularPoint.apUtilityService
     * @description
     * We REALLY don't want to lock the user's browser (blocking the UI thread) while iterating over an array of
     * entities and performing some process on them.  This function cuts the process into as many 50ms chunks as are
     * necessary. Based on example found in the following article:
     * [Timed array processing in JavaScript](http://www.nczonline.net/blog/2009/08/11/timed-array-processing-in-javascript/);
     * @param {Object[]} entities The entities that need to be processed.
     * @param {Function} process Reference to the process to be executed for each of the entities.
     * @param {Object} context this
     * @param {Number} [delay=25] Number of milliseconds to delay between batches.
     * @param {Number} [maxItems=entities.length] Maximum number of entities to process before pausing.
     * @returns {Object} Promise
     * @example
     * <pre>
     * function buildProjectSummary = function() {
             *    var deferred = $q.defer();
             *
             *    // Taken from a fictitious projectsthis.js
             *    projectModel.getAllListItems().then(function(entities) {
             *      var summaryObject = {};
             *      var extendProjectSummary = function(project) {
             *          // Do some process intensive stuff here
             *
             *      };
             *
             *      // Now that we have all of our projects we want to iterate
             *      // over each to create our summary object. The problem is
             *      // this could easily cause the page to hang with a sufficient
             *      // number of entities.
             *      apUtilitythis.batchProcess(entities, extendProjectSummary, function() {
             *          // Long running process is complete so resolve promise
             *          deferred.resolve(summaryObject);
             *      }, 25, 1000);
             *    };
             *
             *    return deferred.promise;
             * }
     *
     * </pre>
     */

    // batchProcess(entities, process, context, delay = 25, maxItems) {
    //     let itemCount = entities.length;
    //     let batchCount = 0;
    //     const chunkMax = maxItems || itemCount;
    //     let index = 0;
    //     const deferred = this.$q.defer();

    //     function chunkTimer() {
    //         batchCount++;
    //         let start = +new Date();
    //         const chunkIndex = index;

    //         while (index < itemCount && (index - chunkIndex) < chunkMax && (<any> new Date() - start < 100)) {
    //             process.call(context, entities[index], index, batchCount);
    //             index += 1;
    //         }

    //         if (index < itemCount) {
    //             this.$timeout(chunkTimer, delay);
    //         } else {
    //             deferred.resolve(entities);
    //         }
    //     }

    //     chunkTimer();

    //     return deferred.promise;
    // }


    /**
     * @ngdoc function
     * @name angularPoint.apUtilityService:convertEffectivePermMask
     * @methodOf angularPoint.apUtilityService
     * @description
     * GetListItemsSinceToken operation returns the list element with an EffectivePermMask attribute which is the
     * name of the PermissionMask.  We then need to convert the name into an actual mask so this function contains
     * the known permission names with their masks.  If a provided mask name is found, the cooresponding mask
     * is returned.  Otherwise returns null.  [MSDN Source](http://msdn.microsoft.com/en-us/library/jj575178(v=office.12).aspx)
     * @param {string} permMaskName Permission mask name.
     * @returns {string|null} Return the mask for the name.
     */
    convertEffectivePermMask(permMaskName: string): string {
        let permissionMask = null;

        const permissions = {
            // General
            EmptyMask: '0x0000000000000000',
            FullMask: '0x7FFFFFFFFFFFFFFF',

            // List and document permissions
            ViewListItems: '0x0000000000000001',
            AddListItems: '0x0000000000000002',
            EditListItems: '0x0000000000000004',
            DeleteListItems: '0x0000000000000008',
            ApproveItems: '0x0000000000000010',
            OpenItems: '0x0000000000000020',
            ViewVersions: '0x0000000000000040',
            DeleteVersions: '0x0000000000000080',
            CancelCheckout: '0x0000000000000100',
            ManagePersonalViews: '0x0000000000000200',
            ManageLists: '0x0000000000000800',
            ViewFormPages: '0x0000000000001000',

            // Web level permissions
            Open: '0x0000000000010000',
            ViewPages: '0x0000000000020000',
            AddAndCustomizePages: '0x0000000000040000',
            ApplyThemeAndBorder: '0x0000000000080000',
            ApplyStyleSheets: '0x0000000000100000',
            ViewUsageData: '0x0000000000200000',
            CreateSSCSite: '0x0000000000400000',
            ManageSubwebs: '0x0000000000800000',
            CreateGroups: '0x0000000001000000',
            ManagePermissions: '0x0000000002000000',
            BrowseDirectories: '0x0000000004000000',
            BrowseUserInfo: '0x0000000008000000',
            AddDelPrivateWebParts: '0x0000000010000000',
            UpdatePersonalWebParts: '0x0000000020000000',
            ManageWeb: '0x0000000040000000',
            UseClientIntegration: '0x0000001000000000',
            UseRemoteAPIs: '0x0000002000000000',
            ManageAlerts: '0x0000004000000000',
            CreateAlerts: '0x0000008000000000',
            EditMyUserInfo: '0x0000010000000000',

            // Special Permissions
            EnumeratePermissions: '0x4000000000000000'
        };

        if (permissions[permMaskName]) {
            permissionMask = permissions[permMaskName];
        }
        return permissionMask;
    }

    /**
     * @ngdoc function
     * @name angularPoint.apUtilityService:dateWithinRange
     * @methodOf angularPoint.apUtilityService
     * @description
     * Converts dates into yyyymmdd formatted ints and evaluates to determine if the dateToCheck
     * falls within the date range provided
     * @param {Date} startDate Starting date.
     * @param {Date} endDate Ending date.
     * @param {Date} [dateToCheck=new Date()] Defaults to the current date.
     * @returns {boolean} Does the date fall within the range?
     */
    dateWithinRange(startDate: Date, endDate: Date, dateToCheck = new Date()): boolean {
        /** Ensure both a start and end date are provided **/
        if (!startDate || !endDate) {
            return false;
        }

        /** Create an int representation of each of the dates */
        const startInt = this.yyyymmdd(startDate);
        const endInt = this.yyyymmdd(endDate);
        const dateToCheckInt = this.yyyymmdd(dateToCheck);

        return startInt <= dateToCheckInt && dateToCheckInt <= endInt;
    }


    /**
     * @ngdoc function
     * @name angularPoint.apUtilityService:doubleDigit
     * @methodOf angularPoint.apUtilityService
     * @description Add a leading zero if a number/string only contains a single character.  So in the case
     * where the number 9 is passed in the string '09' is returned.
     * @param {(number|string)} val A number or string to evaluate.
     * @returns {string} Two digit string.
     */
    doubleDigit(val: number | string): string {
        if (typeof val === 'number') {
            return val > 9 ? val.toString() : '0' + val;
        } else if (typeof val === 'string') {
            return this.doubleDigit(parseInt(val, 10));
        }
    }


    /**
     * @ngdoc function
     * @name angularPoint.apUtilityService:fromCamelCase
     * @methodOf angularPoint.apUtilityService
     * @param {string} str String to convert.
     * @description
     * Converts a camel case string into a space delimited string with each word having a capitalized first letter.
     * @returns {string} Humanized string.
     */
    fromCamelCase(str): string {
        // insert a space before all caps
        return str.replace(/([A-Z])/g, ' $1')
        // uppercase the first character
            .replace(/^./, function (str) {
                return str.toUpperCase();
            });
    }

    /**
     * @ngdoc function
     * @name angularPoint.apUtilityService:isGuid
     * @methodOf angularPoint.apUtilityService
     * @param {any} value Checks if value is a GUID
     * @returns {boolean} Is the value a GUID.
     */

    /**
     * @ngdoc function
     * @name angularPoint.apUtilityService:registerChange
     * @methodOf angularPoint.apUtilityService
     * @description
     * If online and sync is being used, notify all online users that a change has been made.
     * //Todo Break this functionality into FireBase module that can be used if desired.
     * @param {object} model event
     */
    registerChange(model, changeType: string, listItemId: number) {
        /** Disabled this functionality until I can spend the necessary time to test */
        if (model.sync && _.isFunction(model.sync.registerChange)) {
            /** Register change after successful update */
            model.sync.registerChange(changeType, listItemId);
        }
    }


    /**
     * @ngdoc function
     * @name angularPoint.apUtilityService:resolvePermissions
     * @methodOf angularPoint.apUtilityService
     * @param {string} permissionsMask The WSS Rights Mask is an 8-byte, unsigned integer that specifies
     * the rights that can be assigned to a user or site group. This bit mask can have zero or more flags set.
     * @description
     * Converts permMask into something usable to determine permission level for current user.  Typically used
     * directly from a list item.  See ListItem.resolvePermissions.
     *
     * <h3>Additional Info</h3>
     *
     * -   [PermMask in SharePoint DVWPs](http://sympmarc.com/2009/02/03/permmask-in-sharepoint-dvwps/)
     * -   [$().SPServices.SPLookupAddNew and security trimming](http://spservices.codeplex.com/discussions/208708)
     *
     * @returns {object} Object with properties for each permission level identifying if current user has rights (true || false)
     * @example
     * <pre>
     * var perm = apUtilitythis.resolvePermissions('0x0000000000000010');
     * </pre>
     * Example of what the returned object would look like
     * for a site admin.
     * <pre>
     * perm = {
             *    "ViewListItems":true,
             *    "AddListItems":true,
             *    "EditListItems":true,
             *    "DeleteListItems":true,
             *    "ApproveItems":true,
             *    "OpenItems":true,
             *    "ViewVersions":true,
             *    "DeleteVersions":true,
             *    "CancelCheckout":true,
             *    "PersonalViews":true,
             *    "ManageLists":true,
             *    "ViewFormPages":true,
             *    "Open":true,
             *    "ViewPages":true,
             *    "AddAndCustomizePages":true,
             *    "ApplyThemeAndBorder":true,
             *    "ApplyStyleSheets":true,
             *    "ViewUsageData":true,
             *    "CreateSSCSite":true,
             *    "ManageSubwebs":true,
             *    "CreateGroups":true,
             *    "ManagePermissions":true,
             *    "BrowseDirectories":true,
             *    "BrowseUserInfo":true,
             *    "AddDelPrivateWebParts":true,
             *    "UpdatePersonalWebParts":true,
             *    "ManageWeb":true,
             *    "UseRemoteAPIs":true,
             *    "ManageAlerts":true,
             *    "CreateAlerts":true,
             *    "EditMyUserInfo":true,
             *    "EnumeratePermissions":true,
             *    "FullMask":true
             * }
     * </pre>
     */
    resolvePermissions(permissionsMask): IUserPermissionsObject {
        const permissionSet = {
            ViewListItems: (1 & permissionsMask) > 0,
            AddListItems: (2 & permissionsMask) > 0,
            EditListItems: (4 & permissionsMask) > 0,
            DeleteListItems: (8 & permissionsMask) > 0,
            ApproveItems: (16 & permissionsMask) > 0,
            OpenItems: (32 & permissionsMask) > 0,
            ViewVersions: (64 & permissionsMask) > 0,
            DeleteVersions: (128 & permissionsMask) > 0,
            CancelCheckout: (256 & permissionsMask) > 0,
            PersonalViews: (512 & permissionsMask) > 0,

            ManageLists: (2048 & permissionsMask) > 0,
            ViewFormPages: (4096 & permissionsMask) > 0,

            Open: (65536 & permissionsMask) > 0,
            ViewPages: (131072 & permissionsMask) > 0,
            AddAndCustomizePages: (262144 & permissionsMask) > 0,
            ApplyThemeAndBorder: (524288 & permissionsMask) > 0,
            ApplyStyleSheets: (1048576 & permissionsMask) > 0,
            ViewUsageData: (2097152 & permissionsMask) > 0,
            CreateSSCSite: (4194314 & permissionsMask) > 0,
            ManageSubwebs: (8388608 & permissionsMask) > 0,
            CreateGroups: (16777216 & permissionsMask) > 0,
            ManagePermissions: (33554432 * permissionsMask) > 0,
            BrowseDirectories: (67108864 & permissionsMask) > 0,
            BrowseUserInfo: (134217728 & permissionsMask) > 0,
            AddDelPrivateWebParts: (268435456 & permissionsMask) > 0,
            UpdatePersonalWebParts: (536870912 & permissionsMask) > 0,
            ManageWeb: (1073741824 & permissionsMask) > 0,
            UseRemoteAPIs: (137438953472 & permissionsMask) > 0,
            ManageAlerts: (274877906944 & permissionsMask) > 0,
            CreateAlerts: (549755813888 & permissionsMask) > 0,
            EditMyUserInfo: (1099511627776 & permissionsMask) > 0,
            EnumeratePermissions: (4611686018427387904 & permissionsMask) > 0,
            FullMask: (9223372036854775807 == permissionsMask)
        };

        /**
         * Full Mask only resolves correctly for the Full Mask level
         * so in that case, set everything to true
         */
        if (permissionSet.FullMask) {
            _.each(permissionSet, (perm, key) => {
                permissionSet[key] = true;
            });
        }

        return permissionSet;
    }


    /**
     * @ngdoc function
     * @name angularPoint.apUtilityService:stringifyXML
     * @methodOf angularPoint.apUtilityService
     * @description Simple utility to convert an XML object into a string and remove unnecessary whitespace.
     * @param {object} xml XML object.
     * @returns {string} Stringified version of the XML object.
     */
    stringifyXML(xml: Element): string {
        let str;

        if (_.isObject(xml)) {
            str = this.xmlToString(xml).replace(/\s+/g, ' ');
        } else if (_.isString(xml)) {
            str = xml;
        }
        return str;
    }


    toCamelCase(str): string {
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (letter, index) {
            return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
        }).replace(/\s+/g, '');
    }


    /**
     * @ngdoc function
     * @name angularPoint.apUtilityService:yyyymmdd
     * @methodOf angularPoint.apUtilityService
     * @description
     * Convert date into a int formatted as yyyymmdd
     * We don't need the time portion of comparison so an int makes this easier to evaluate
     */
    yyyymmdd(date: Date): number {
        const yyyy = date.getFullYear();
        const mm = date.getMonth() + 1;
        const dd = date.getDate();
        /** Add leading 0's to month and day if necessary */
        return parseInt(yyyy + this.doubleDigit(mm) + this.doubleDigit(dd), 10);
    }

    xmlToString(xmlData) {
        let xmlString;
        if (typeof XMLSerializer !== 'undefined') {
            /** Modern Browsers */
            xmlString = (new XMLSerializer()).serializeToString(xmlData);
        } else {
            /** Old versions of IE */
            xmlString = xmlData.xml;
        }
        return xmlString;
    }


}

/** Extend lodash with a simple helper function */
_.mixin({
    isDefined: function (value) {
        return !_.isUndefined(value);
    },
    /** Based on functionality in Breeze.js */
    isGuid: function (value) {
        return (typeof value === 'string') && /[a-fA-F\d]{8}-(?:[a-fA-F\d]{4}-){3}[a-fA-F\d]{12}/
                .test(value);
    }
});

/**
 * @ngdoc function
 * @name angularPoint.apUtilityService:isGuid
 * @methodOf angularPoint.apUtilityService
 * @param {any} value Checks if value is a GUID
 * @returns {boolean} Is the value a GUID.
 */
export function isGuid(value): boolean {
    return (typeof value === 'string') && /[a-fA-F\d]{8}-(?:[a-fA-F\d]{4}-){3}[a-fA-F\d]{12}/
            .test(value);
}

export function isDefined(value) {
    return !_.isUndefined(value);
}
