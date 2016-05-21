import {ListItem} from "../factories/list-item.factory";
import {webServices} from "../constants";
import {modelBehaviorSubject} from "../services/cache.service";
import {encodeValue, generateValuePairs} from "../services/encode.service";
import {MockConnection} from "@angular/http/testing";
import {Response, Headers, ResponseOptions, ResponseType} from "@angular/http";
import {listItemUpdateStream$, IListItemUpdate} from "../services/change.service";
import {ListService} from "../factories/list-service.factory.ts";

import {User} from "../factories/user.factory";
import * as mockServicesXML from "./mock-services-xml";

let mockListsXML: { [ key: string ]: string } = {};
let mockUser: User;

import * as jQuery from 'jquery';
import {each, unescape, escape, uniqueId, isArray} from 'lodash';


/**
 * @description Initialize mock backend with required data to
 * resovle mock requests when working offline
 * 
 * @export
 * @param {{ [ key: string ]: string }} _mockListsXML GUID as key with xml as string for value
 * @param {User} _mockUser The user that will be used for all mock requests
 * @param {{ [ key: string ]: string }} [_mockServicesXML={}] Optionally specify additional
 * mock services that we'll extend
 */
function initializeMockBackend(
    _mockListsXML: { [ key: string ]: string },
    _mockUser: User
    // _mockServicesXML: { [ key: string ]: string } = {}
) {
    
    if (!_mockListsXML || !_mockUser) {
        throw new Error('Require MOCK data is missing.');
    }
    
    Object.assign(mockListsXML, _mockListsXML);
    mockUser = _mockUser;
    // Object.assign(mockServicesXML, _mockServicesXML);
}

class ModelChangeQueue {
    pendingDeletions = [];
    pendingUpdates = [];

    constructor(private token: string) {
    }

    clear(updatedToken: string) {
        this.token = updatedToken || '';
        this.pendingDeletions = [];
        this.pendingUpdates = [];
    }
}

let activeEntities: { [ key: number ]: ListItem<any> } = {}; // { listItem.id: ListItem, ...}

let changeQueue: { [ key: string ]: ModelChangeQueue } = {};
const xmlNS = {
    listItems: `xmlns:s="uuid:BDC6E3F0-6DA3-11d1-A2A3-00AA00C14882" 
            xmlns:dt="uuid:C2F41010-65B3-11d1-A29F-00AA00C14882"
            xmlns:rs="urn:schemas-microsoft-com:rowset" 
            xmlns:z="#RowsetSchema"`,
    soap: `xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
            xmlns:xsd="http://www.w3.org/2001/XMLSchema"`
};

// Subscribe to stream of list item change events
listItemUpdateStream$.subscribe((listItemUpdate: IListItemUpdate) => {
    if (!listItemUpdate) {
        return;
    }
    activeEntities[ listItemUpdate.listItem.id ] = listItemUpdate.listItem;
});

let mockId = 10000;
function getMockId() {
    return mockId++;
}

let listItemsByIdMap: { [ key: string ]: ListItem<any>[] } = {};

let listServicesMap: { [ key: string ]: ListService<any> } = {};


function getListItemsByListId(listId: string): ListItem<any>[] {
    let store = <any>listItemsByIdMap[ listId.toLowerCase() ] || [];
    return isArray(store) ? store : store.entities;
}
function getListServiceByListId<T extends ListService<any>>(listId: string): T {
    return <any>listServicesMap[ listId.toLowerCase() ];
}

modelBehaviorSubject.subscribe((listService: ListService<any>) => {
    if (listService) {
        let listId = listService.getListId().toLowerCase();
        listServicesMap[ listId ] = listService;

        let store = listService.getStore();
        if (store) {
            store.subscribe((listItems) => {
                listItemsByIdMap[ listId ] = listItems;
            });
        }
    }
});

export {initializeMockBackend, generateMockResponse};

function generateMockResponse(mockConnection: MockConnection) {
    let requestXML = new DOMParser().parseFromString(<string>mockConnection.request.text(), 'text/xml');
    let soapEnvelope = requestXML
        .getElementsByTagNameNS('http://schemas.xmlsoap.org/soap/envelope/', 'Body');
    let mainNode = <Element>soapEnvelope[ 0 ].childNodes[ 0 ]; // ex <GetUserProfileByName ...
    let operation = mainNode.nodeName; // ex: 'GetUserProfileByName'
    let responseXML: Element | string;

    if (mockConnection.request.url.includes('Lists.asmx')) {
        switch (operation) {
            case 'GetListItems':
                responseXML = getNamedListItems(mainNode);
                // responseXML = getListItems(mainNode);
                break;
            // case 'GetList':
            case 'GetListItemChangesSinceToken':
                throw new Error(`Need to evaluate if we should use "GetListItemChangesSinceToken" and if so how to properly mock.`);
            case 'UpdateListItems':
                responseXML = updateListItem(mainNode);
                break;
            default:
                responseXML = mockServicesXML[ operation ];
            // responseXML = apCachedXML.operations[operation];
        }
    } else {
        /** Listen for each of the standard services being called and try to return a cached 
         * XML response for the
         * operation */
        each(webServices, function (service) {
            /** Lists has many special cases so don't create generic backend for it */
            if (service !== 'Lists' && mockConnection.request.url.includes('bin/' + service + '.asmx')) {
                if (!mockServicesXML[ operation ]) {
                    throw new Error(`No mock XML found for the ${operation} operation.  You need to add the data in the mock services xml folder.`);
                }
                responseXML = mockServicesXML[ operation ];
                // responseXML = apCachedXML.operations[operation];
            }
        });
    }

    // Set artificial delay for response
    setTimeout(() => {
        let responseObject = new Response({
            body: responseXML,
            status: 200,
            url: mockConnection.request.url,
            headers: new Headers({}),
            statusText: 'Yippie',
            type: 0,
            merge: () => undefined
        });

        mockConnection.mockRespond(responseObject);
    }, 0);


}

function getNamedListItems(request: Element): string {
    let listId = getListId(request);
    if (mockListsXML[ listId ]) {
        return mockListsXML[ listId ];
    } else {
        throw new Error('No cached file found for list with GUID of ' + listId);
    }
}


function convertUpdateRequestToResponse(request: any, optionalAttributes): string {
    var fields = jQuery(request).find('Field');
    var changeObject = {};
    each(fields, function (field: Element) {
        var fieldName = jQuery(field).attr('Name');
        var fieldValue = jQuery(field).text();
        changeObject[ fieldName ] = unescape(fieldValue);
    });
    Object.assign(changeObject, optionalAttributes);
    return createZRow(changeObject);
}

function createZRow(changeObject: Object): string {
    var zrow = '<z:row ';
    each(changeObject, function (fieldValue: string, fieldName: string) {
        zrow += ` ows_${fieldName}="${escape(fieldValue)}"`;
    });
    zrow += ` xmlns:z="#RowsetSchema"/>`;
    return zrow;
}

function updateListItem(request: Element): string {

    var zrow,
        overrides,
        updateMethod = request.getElementsByTagName('Method')[ 0 ];

    let cmd = updateMethod.getAttribute('Cmd');

    switch (cmd) {
        /** Create list item */
        case 'New':
            var model = getListService(request);
            /** Need to create an id so find set it 1 higher than the id 
             * of the most recent entity */
            let cachedListItems = getListItemsByListId(model.getListId());
            let maxId = cachedListItems.reduce((id, listItem) => {
                return id > listItem.id ? id : listItem.id;
            }, 0);

            var mockId = maxId > 0 ? maxId + 1 : getMockId();

            // Mock Fields that would be set upon list item creation
            overrides = {
                ID: mockId,
                Modified: encodeValue('DateTime', new Date()),
                Created: encodeValue('DateTime', new Date()),
                Author: encodeValue('User', mockUser),
                Editor: encodeValue('User', mockUser),
                PermMask: '0x7fffffffffffffff',
                UniqueId: mockId + ';#{11FF840D-9CE1-4961-B7FD-51B9DF07706B}',
                FileRef: mockId + ';#sitecollection/site/ListName/' + mockId + '_.000'
            };

            zrow = convertUpdateRequestToResponse(request, overrides);
            registerUpdate(request, zrow);
            break;
        case 'Update':
            var listItemStrId = jQuery(request).find(`Field[Name="ID"]`).text();
            // Retrieve the JS Object that is attempting to update
            var activeEntity = activeEntities[ listItemStrId ];

            if (!activeEntity) {
                throw new Error(`An unexpected list item is trying to be updated.`)
            }

            // Mock fields that would be updated when a list item is update
            overrides = {
                Modified: encodeValue('DateTime', new Date()),
                Editor: encodeValue('User', mockUser),
                Version: activeEntity.version ? activeEntity.version + 1 : 2
            };

            var fieldDefinitions = activeEntity.getListService().fields;
            var valuePairs = generateValuePairs(fieldDefinitions, activeEntity);
            var encodedValues = {};
            each(valuePairs, function (pair) {
                encodedValues[ pair[ 0 ] ] = pair[ 1 ];
            });

            var opts = Object.assign({}, encodedValues, overrides);

            zrow = convertUpdateRequestToResponse(request, opts);
            registerUpdate(request, zrow);

            // Cleanup
            delete activeEntities[ listItemStrId ];
            break;
        case 'Delete':
            /** No z:row element when deleted */
            zrow = '';

            each(jQuery(request).find('Field'), function (field) {
                var fieldId = parseInt(jQuery(field).text(), 10);
                registerDeletion(request, fieldId);
            });
            break;
    }

    var responseEnvelope = listsResponseEnvelope('UpdateListItems');

    var payload = `
    <Results>
        <Result ID="1,${cmd}">
            <ErrorCode>0x00000000</ErrorCode>
            ${zrow}
        </Result>
    </Results>`;
    var xmlResponse = responseEnvelope.header + payload + responseEnvelope.footer;
    return xmlResponse;
}

function registerUpdate(request: Element, zrow: Element): void {
    getChangeTokenCache(request).pendingUpdates.push(zrow);
}

function registerDeletion(request: Element, id: number): void {
    getChangeTokenCache(request).pendingDeletions.push(id);
}

function getChangeTokenCache(request: Element) {
    var model = getListService(request);
    changeQueue[ model.guid ] =
        changeQueue[ model.guid ] || new ModelChangeQueue(generateChangeToken(request));
    return changeQueue[ model.guid ];
}

function generateChangeToken(request: Element): string {
    var listService = getListService(request);
    return uniqueId(listService ? listService.guid : '');
}

function listsResponseEnvelope(operation: string): { footer: string; header: string; payload: string; } {
    var response = {
        footer: `</${operation}Result></${operation}Response></soap:Body></soap:Envelope>`,
        header: `<?xml version="1.0" encoding="utf-8"?>
                    <soap:Envelope ${xmlNS.soap}>
                        <soap:Body>
                            <${operation}Response xmlns="http://schemas.microsoft.com/sharepoint/soap/">
                            <${operation}Result>`,
        payload: ''
    };
    return response;
}

function getListService(request: Element): ListService<any> {
    /** Find the list id */
    var listGuid = getListId(request);
    /** Check with cache service to see if a list with the matching guid has registered */
    return getListServiceByListId(listGuid);
}

function getListId(request: Element): string {
    return getXMLNodeContents(request, 'listName');
}

function getXMLNodeContents(request: Element, element): string {
    var changeToken;
    var changeTokenNode = jQuery(request).find(element);
    if (changeTokenNode.length) {
        changeToken = changeTokenNode.text();
    }
    return changeToken;
}

// function getListItems(request: Element) {
//     var zrows = [];
//     var rowLimit = jQuery(request).find('rowLimit').text();
//     // if (rowLimit === '1') {
//     //     var zrow = getListItemById(request);
//     //     if (!zrow) {
//     //         /** A match wasn't found so return a mock */
//     //         zrow = generateMockListItems(request, 1)[0];
//     //     }
//     //     zrows.push(zrow);
//     // } else {
//     var listService = getListService(request);
//     if (listService.lastServerUpdate) {
//         //Follow-on request
//         // let cachedListItemMap = cacheService.getCachedEntities(model.getListId());
//         let entities = getListItemsByListId(listService.getListId());
//         zrows = entities.map(listItem => {
//             let zrow = createZRowFromListItem(listItem);
//             return zrow;
//         });
//     } else {
//         //Initial request
//         zrows = getZRows(request);
//     }
//     // }
//
//     var responseEnvelope = listsResponseEnvelope('GetListItems');
//     var payload = '<listitems ' + xmlNS.listItems + '>' + buildRSDataNode(zrows) + '</listitems>';
//
//     return responseEnvelope.header + payload + responseEnvelope.footer;
// }

// function createZRowFromListItem(listItem): string {
//     var fieldDefinitions = listItem.getListService().fields;
//     var valuePairs = generateValuePairs(fieldDefinitions, listItem);
//     var encodedValues = {};
//     each(valuePairs, function (pair) {
//         encodedValues[pair[0]] = pair[1];
//     });
//
//     return createZRow(encodedValues);
//
// }

// function getZRows(request: Element): Element {
//     var responseXML = getNamedListItems('GetListItems', request);
//
//     var parsedXML = new DOMParser().parseFromString(responseXML, 'text/xml');
//     return locateListItemNodes(parsedXML);
// }

/**
 * @ngdoc function
 * @name getListItemById
 * @description
 * Attempts to retrieve an xml zrow from cached xml.
 * @param {xml} request XML Request.
 * @returns {xml} zrow
 */
// function getListItemById(request: Element): Element {
//     var match;
//     /** Retrieve the list item id */
//     var id = jQuery(request).find('Query').find('Value[Type="Number"]').text();
//     var rows = getZRows(request);
//     //var rows = locateListItemNodes(request);
//
//     /** Attempt to find the requested list item in the cached xml */
//     each(rows, function (row) {
//         if (jQuery(row).attr('ows_ID') == id) {
//             match = row;
//             /** Break loop */
//             return false;
//         }
//     });
//
//     /** Returns a single entity */
//     return match || rows[0];
// }
// function getListItemChangesSinceToken(data: string, request: Element): string {
//     var responseXML, responseEnvelope, changeNodes, payload;
//     var changeToken = getChangeToken(request);
//     var newChangeToken = generateChangeToken(request);
//     if (changeToken) {
//         /** Follow on request */
//         responseEnvelope = listsResponseEnvelope('GetListItemChangesSinceToken');
//         changeNodes = getChangesSinceToken(request, newChangeToken);
//         payload = `<listitems ${xmlNS.listItems}> ${changeNodes.changes} ${changeNodes.rsdata}</listitems>`;
//         responseXML = responseEnvelope.header + payload + responseEnvelope.footer;
//     } else {
//         var model = getListService(request);
//         registerChangeToken(request, newChangeToken);
//         /** Initial request so register this token */
//         if (apCachedXML.lists[model.title] && apCachedXML.lists[model.title].GetListItemChangesSinceToken) {
//             /** Use Cached XML */
//             responseXML = apCachedXML.lists[model.title].GetListItemChangesSinceToken;
//         } else {
//             /** Generate mocks if no cached XML is found */
//             responseEnvelope = listsResponseEnvelope('GetListItemChangesSinceToken');
//             /** Add mocked items to change queue */
//             changeQueue[model.guid].pendingUpdates = generateMockListItems(request, 10);
//             changeNodes = getChangesSinceToken(request, newChangeToken);
//             payload = `<listitems ${xmlNS.listItems}>${changeNodes.changes} ${changeNodes.rsdata}</listitems>`;
//             responseXML = responseEnvelope.header + payload + responseEnvelope.footer;
//         }
//     }
//     return responseXML;
// }

// function buildRSDataNode(zrows: Element[]): string {
//
//     var rsdata = `<rs:data ItemCount="${zrows.length}">`;
//     each(zrows, function (zrow: Element) {
//         /** Work with zrows that have been parsed to xml as well as those that are still strings */
//         rsdata += typeof zrow === 'object' ? stringifyXML(zrow) : zrow;
//     });
//     rsdata += '</rs:data>';
//     return rsdata;
// }

// function getChangesSinceToken(request: Element, token: string): { changes: string; rsdata: string; } {
//     var response = { changes: '', rsdata: '' };
//     var listService = getListService(request);
//     var changesSinceToken = getChangeTokenCache(request);
//     /** Build XML for any list items that have been added or updated */
//     response.rsdata = buildRSDataNode(changesSinceToken.pendingUpdates);
//
//     /* Build Changes XML node for entities that have been deleted.  There are other valid changes [Restore] but
//      at this point we're only concerned with mocking deleted items */
//     response.changes = `<Changes LastChangeToken="${token}">`;
//     if (changesSinceToken.pendingDeletions.length > 0) {
//         each(changesSinceToken.pendingDeletions, function (listItemId) {
//             response.changes += `<Id ChangeType="Delete" UniqueId="">${listItemId}</Id>`;
//         });
//     }
//     response.changes += '</Changes>';
//
//     /** Clear out changes for next time */
//     changesSinceToken.clear(token);
//     return response;
// }


// function registerChangeToken(request: Element, token: string): void {
//     var model = getListService(request);
//     changeQueue[model.guid] = new ModelChangeQueue(token);
// }


// function getChangeToken(request: Element): string {
//     return getXMLNodeContents(request, 'changeToken');
// }


// function generateMockListItems(request: Element, quantity: number): Element[] {
//     var listService = getListService(request);
//     var mockRecords = listService.generateMockData({ quantity: quantity });
//     var zrows = [];
//     each(mockRecords, function (mockRecord) {
//         var changeObject = {};
//         /** Generate value pairs for each property on the mock object */
//         var valuePairs = generateValuePairs(listService.fields, mockRecord);
//         /** Create a key/val property for each valuePiar */
//         each(valuePairs, function (valuePair) {
//             changeObject[valuePair[0]] = valuePair[1];
//         });
//         zrows.push(createZRow(changeObject));
//     });
//     return zrows;
// }

// function getNamedListItems(operation: string, request: Element): string {
//     let listId = getListId(request);
//     if (mockListsXML[listId]) {
//         return mockListsXML[listId];
//     } else {
//         throw new Error('No cached file found for list with GUID of ' + listId);
//
//         // console.info('No Cached Data Found For ' + listId);
//         // /** No cached XML so just use the default operation response */
//         // responseXML = mockServicesXML[operation];
//     }
//     /** Check with cache service to see if a list with the matching guid has registered */
//     // var listModel = getListService(request);
//     // if (listModel) {
//     //     /** Use the list name in the model to see if we have cached XML */
//     //     responseXML = getCachedResponse(operation, listModel.title);
//     // }
//     // if (!responseXML) {
//     //     console.info('No Cached Data Found For ' + listModel.title);
//     //     /** No cached XML so just use the default operation response */
//     //     responseXML = mockServicesXML[operation];
//     //     // responseXML = getCachedResponse(operation);
//     // }
// }

// function getCachedResponse(operation: string, fileName?: string): string {
//     var response;
//     fileName = (fileName || operation).replace(' ', ''); //Remove spaces

//     if (apCachedXML.lists[fileName] && apCachedXML.lists[fileName][operation]) {
//         response = apCachedXML.lists[fileName][operation];
//     } else if (Object.keys(apCachedXML.lists[fileName]).length > 0) {
//         /** The exact operation we'd looking for isn't found but there's another there so we'll try that */
//         response = apCachedXML.lists[fileName][Object.keys(apCachedXML.lists[fileName])[0]];
//     }
//     return response;
// }

// function responder(responseXML) {
//     return [200, responseXML];
// }
