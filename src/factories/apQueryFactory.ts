/// <reference path="../app.module.ts" />

module ap {
    'use strict';

    var $q: ng.IQService, apIndexedCacheFactory: IndexedCacheFactory, apConfig: IAPConfig, apDefaultListItemQueryOptions,
        apDataService: DataService, apDecodeService: DecodeService, apLogger: Logger;

    export interface IQueryOptions {
        force?: boolean;
        //Only relevant if requesting a single item
        listItemID?: number;
        localStorage?: boolean;
        localStorageExpiration?: number;
        name?: string;
        operation?: string;
        query?: string;
        queryOptions?: string;
        //Returns all items if set to 0
        rowLimit?: number;
        runOnce?: boolean;
        sessionStorage?: boolean;
        viewFields?: string;
        webURL?: string;
    }

    export interface IQuery<T extends ListItem<any>> {
        cacheXML?: boolean;
        changeToken?: string;
        execute(options?: Object): ng.IPromise<IndexedCache<T>>;
        force: boolean;
        getCache(): IndexedCache<T>;
        getLocalStorage(): LocalStorageQuery;
        getModel(): Model;
        hydrateFromLocalStorage(localStorageQuery: LocalStorageQuery): void;
        indexedCache: IndexedCache<T>;
        initialized: ng.IDeferred<IndexedCache<T>>
        lastRun: Date;
        listItemID?: number;
        listName: string;
        localStorage: boolean;
        localStorageExpiration: number;
        name: string;
        negotiatingWithServer: boolean;
        // offlineXML?: string;
        operation?: string;
        promise?: ng.IPromise<IndexedCache<T>>;
        query?: string;
        queryOptions?: IQueryOptions;
        rowLimit?: number;
        runOnce: boolean;
        saveToLocalStorage(): void;
        sessionStorage: boolean;
        viewFields: string;
        webURL?: string;
    }

    export class LocalStorageQuery {
        changeToken: string;
        indexedCache: { [key: number]: Object };
        lastRun: Date;
        constructor(private key: string, stringifiedQuery: string) {
            let parsedQuery = JSON.parse(stringifiedQuery);
            _.assign(this, parsedQuery);
            this.lastRun = new Date(parsedQuery.lastRun);
        }
        hasExpired(localStorageExpiration: number = apConfig.localStorageExpiration): boolean {
            let hasExpired = true;
            if (_.isNaN(localStorage)) {
                throw new Error('Local storage expiration is required to be a numeric value and instead is ' + localStorageExpiration);
            } else if (localStorageExpiration === 0) {
                //No expiration
                hasExpired = false;
            } else {
                //Evaluate if cache has exceeded expiration
                hasExpired = this.lastRun.getMilliseconds() + localStorageExpiration <= new Date().getMilliseconds();
            }
            return hasExpired;
        }
        removeItem() {
            localStorage.removeItem(this.key);
        }
    }




    /**
     * @ngdoc function
     * @name Query
     * @description
     * Primary constructor that all queries inherit from. This object is a passthrough to [SPServices](http: //spservices.codeplex.com/).  All
     * options to passed through to [dataService.executeQuery](#/api/dataService.executeQuery).
     * @param {object} queryOptions Initialization parameters.
     * @param {boolean} [queryOptions.force=false] Ignore cached data and force server query.
     * @param {number} [queryOptions.listItemID] Optionally request for a single list item by id.
     * @param {boolean} [queryOptions.localStorage=false] Should we store data from this query in local storage to speed up requests in the future.
     * @param {number} [queryOptions.localStorageExpiration=86400000] Set expiration in milliseconds - Defaults to a day
     * and if set to 0 doesn't expire.  Can be updated globally using apConfig.localStorageExpiration.
     * @param {string} [queryOptions.name=primary] The name that we use to identify this query.
     * @param {string} [queryOptions.operation=GetListItemChangesSinceToken] Optionally use 'GetListItems' to
     * receive a more efficient response, just don't have the ability to check for changes since the last time
     * the query was called. Defaults to [GetListItemChangesSinceToken](http://msdn.microsoft.com/en-us/library/lists.lists.getlistitemchangessincetoken%28v=office.12%29.aspx)
     * but for a smaller payload and faster response you can use [GetListItems](http: //spservices.codeplex.com/wikipage?title=GetListItems&referringTitle=Lists).
     * @param {string} [queryOptions.query=Ordered ascending by ID] CAML query passed to SharePoint to control
     * the data SharePoint returns. Josh McCarty has a good quick reference [here](http: //joshmccarty.com/2012/06/a-caml-query-quick-reference).
     * @param {string} [queryOptions.queryOptions] SharePoint options xml as string.
     * <pre>
     * <QueryOptions>
     *    <IncludeMandatoryColumns>FALSE</IncludeMandatoryColumns>
     *    <IncludeAttachmentUrls>TRUE</IncludeAttachmentUrls>
     *    <IncludeAttachmentVersion>FALSE</IncludeAttachmentVersion>
     *    <ExpandUserField>FALSE</ExpandUserField>
     * </QueryOptions>
     * </pre>
     * @param {string} [queryOptions.rowLimit] The number of list items to return, 0 returns all list items.
     * @param {boolean} [queryOptions.runOnce] Pertains to GetListItems only, optionally run a single time and return initial value for all future
     * calls.  Works well with data that isn't expected to change throughout the session but unlike localStorage or sessionStorage
     * the data doesn't persist between sessions.
     * @param {boolean} [queryOptions.sessionStorage=false] Use the browsers sessionStorage to cache the list items and uses the
     * queryOptions.localStorageExpiration param to validate how long the cache is good for.
     * @param {string} [queryOptions.viewFields] XML as string that specifies fields to return.
     * @param {string} [queryOptions.webURL] Used to override the default URL if list is located somewhere else.
     * @param {object} model Reference to the parent model for the query.  Allows us to reference when out of
     * scope.
     * @example
     * <pre>
     * // Query to retrieve the most recent 25 modifications
     * model.registerQuery({
     *    name: 'recentChanges',
     *    CAMLRowLimit: 25,
     *    query: '' +
     *        '<Query>' +
     *        '   <OrderBy>' +
     *        '       <FieldRef Name="Modified" Ascending="FALSE"/>' +
     *        '   </OrderBy>' +
     *            // Prevents any records from being returned if user
     *            // doesn't have permissions on project
     *        '   <Where>' +
     *        '       <IsNotNull>' +
     *        '           <FieldRef Name="Project"/>' +
     *        '       </IsNotNull>' +
     *        '   </Where>' +
     *        '</Query>'
     * });
     * </pre>
     */
    export class Query<T extends ListItem<any>> implements IQuery<T> {
        /** Very memory intensive to enable cacheXML which is disabled by default*/
        cacheXML = false;
        /** Reference to the most recent query when performing GetListItemChangesSinceToken */
        changeToken: string;
        force = false;
        getModel: () => Model;
        /** Key value hash map with key being the id of the entity */
        indexedCache = apIndexedCacheFactory.create<T>();
        /** Promise resolved after first time query is executed */
        initialized = $q.defer();
        /** Date/Time last run */
        lastRun: Date;
        listItemID: number;
        listName: string;
        /** Should we store data from this query in local storage to speed up requests in the future */
        localStorage = false;
        /** Set expiration in milliseconds - Defaults to a day and if set to 0 doesn't expire */
        localStorageExpiration = apConfig.localStorageExpiration;
        name: string;
        /** Flag to prevent us from makeing concurrent requests */
        negotiatingWithServer = false;
        /** Every time we run we want to check to update our cached data with
         * any changes made on the server */
        operation = 'GetListItemChangesSinceToken';
        promise: ng.IPromise<IndexedCache<T>>;
        /** Default query returns list items in ascending ID order */
        query: string = `
        <Query>
           <OrderBy>
               <FieldRef Name="ID" Ascending="TRUE"/>
           </OrderBy>
        </Query>`;
        queryOptions = ap.DefaultListItemQueryOptions;
        rowLimit: number;
        runOnce = false;
        sessionStorage = false;
        viewFields: string;
        webURL: string;

        constructor(queryOptions: IQueryOptions, model: Model) {
            let list = model.getList();
            //Use the default viewFields from the model
            this.viewFields = list.viewFields;
            this.listName = model.getListId();

            /** Set the default url if the config param is defined, otherwise let SPServices handle it */
            if (apConfig.defaultUrl) {
                this.webURL = apConfig.defaultUrl;
            }

            //Allow all values on query to be overwritten by queryOptions object
            _.assign(this, queryOptions);

            /** Allow the model to be referenced at a later time */
            this.getModel = () => model;
        }



        /**
         * @ngdoc function
         * @name Query.execute
         * @methodOf Query
         * @description
         * Query SharePoint, pull down all initial records on first call along with list definition if using
         * "GetListItemChangesSinceToken".  Note: this is  substantially larger than "GetListItems" on first call.
         * Subsequent calls pulls down changes (Assuming operation: "GetListItemChangesSinceToken").
         * @param {object} [options] Any options that should be passed to dataService.executeQuery.
         * @returns {object[]} Array of list item objects.
         */
        execute(options): ng.IPromise<IndexedCache<T>> {
            var query = this;
            var model = query.getModel();
            var deferred = $q.defer();

            /** Return existing promise if request is already underway or has been previously executed in the past
            * 1/10th of a second */
            if (query.negotiatingWithServer || (_.isDate(query.lastRun) && query.lastRun.getTime() + apConfig.queryDebounceTime > new Date().getTime())) {
                return query.promise;
            } else {
                /** Set flag to prevent another call while this query is active */
                query.negotiatingWithServer = true;

                let localStorageData = this.getLocalStorage();
                //Check to see if we have a version in localStorage

                let defaultCache = query.getCache();

                /** Clear out existing cached list items if GetListItems is the selected operation because otherwise
                 * we could potentially have stale data if a list item no longer meets the query parameters but already
                 * exists in the cache from a previous request. */
                if(this.operation === 'GetListItems') {
                    defaultCache.clear();
                }

                let defaults = {
                    /** Designate the central cache for this query if not already set */
                    target: defaultCache
                };

                /** Extend defaults with any options */
                let queryOptions: IExecuteQueryOptions = _.assign(defaults, options);

                /** Flag used to determine if we need to make a request to the server */
                let makeRequest = true;

                /** See if we already have data in local storage and hydrate if it hasn't expired, which
                * then allows us to only request the changes. */
                if (!query.force && localStorageData) {
                    switch (this.operation) {
                        case 'GetListItemChangesSinceToken':
                            //Only run the first time, after that the token/data are already in sync
                            if (!query.lastRun) {
                                query.hydrateFromLocalStorage(localStorageData);
                            }
                            break;
                        case 'GetListItems':
                            query.hydrateFromLocalStorage(localStorageData);
                            //Use cached data if we have data already available
                            makeRequest = this.getCache().count() > 0;
                    }
                }

                /** Optionally handle query.runOnce for GetListItems when initial call has already been made */
                if (this.operation === 'GetListItems' && !query.lastRun && this.runOnce) {
                    makeRequest = false;
                }

                if (makeRequest) {
                    apDataService.executeQuery<T>(model, query, queryOptions).then((results) => {
                        this.processResults(results, deferred, queryOptions);
                    });
                } else {
                    this.processResults(this.getCache(), deferred, queryOptions);
                }

                /** Save reference on the query **/
                query.promise = deferred.promise;
                return deferred.promise;
            }
        }
        /**
         * @ngdoc function
         * @name Query.getCache
         * @methodOf Query
         * @description
         * Use this to return the cache instead of using the actual property to allow for future refactoring.
         * @returns {IndexedCache<T>} Indexed Cache containing all elements in query.
         */
        getCache(): IndexedCache<T> {
            return this.indexedCache;
        }

        /**
         * @ngdoc function
         * @name Query.getLocalStorage
         * @methodOf Query
         * @description
         * Use this to return query data currenty saved in user's local or session storage.
         * @returns {LocalStorageQuery} Local storage data for this query.
         */
        getLocalStorage(): LocalStorageQuery {
            let parsedQuery, localStorageKey = this.getLocalStorageKey();
            let stringifiedQuery = localStorage.getItem(localStorageKey) || sessionStorage.getItem(localStorageKey);
            if (stringifiedQuery) {
                parsedQuery = new LocalStorageQuery(localStorageKey, stringifiedQuery);
            }
            return parsedQuery;
        }

        /**
         * @ngdoc function
         * @name Query.hydrateFromLocalStorage
         * @methodOf Query
         * @description
         * If data already exists in browser local storage, we rehydrate JSON using list item constructor and
         * then have the ability to just check the server to see what has changed from the current state.
         */
        hydrateFromLocalStorage(localStorageQuery: LocalStorageQuery): void {
            if (localStorageQuery.hasExpired(this.localStorageExpiration)) {
                //Don't continue and purge if data has exceeded expiration
                localStorageQuery.removeItem();
            } else {
                let listItemProvider = apDecodeService.createListItemProvider<T>(this.getModel(), this, this.getCache());
                //Hydrate each raw list item and add to cache
                _.each(localStorageQuery.indexedCache, (rawObject: Object) => {
                    listItemProvider(rawObject);
                });
                //Set the last run date
                this.lastRun = localStorageQuery.lastRun;
                //Store the change token
                this.changeToken = localStorageQuery.changeToken;
                //Resolve initial query promise in case any other concurrent requests are waiting for the data
                this.initialized.resolve(this.getCache());
            }
        }

        /**
         * @ngdoc function
         * @name Query.processResults
         * @methodOf Query
         * @description
         * Internal method exposed to allow for testing.  Handle cleanup after query execution is complete.
         */
        processResults(results: ap.IndexedCache<T>, deferred: ng.IDeferred<any>, queryOptions: IExecuteQueryOptions) {
            let query = this;
            let model = query.getModel();

            /** Set flag if this if the first time this query has been run */
            var firstRunQuery = _.isNull(query.lastRun);

            if (firstRunQuery) {
                /** Promise resolved the first time query is completed */
                query.initialized.resolve(queryOptions.target);
            }

            /** Set list permissions if not already set */
            var list = model.getList();
            if (!list.permissions && results.first()) {
                /** Query needs to have returned at least 1 item so we can use permMask */
                list.extendPermissionsFromListItem(results.first());
            }

            /** Remove lock to allow for future requests */
            query.negotiatingWithServer = false;

            /** Store query completion date/time on model to allow us to identify age of data */
            model.lastServerUpdate = new Date();

            deferred.resolve(queryOptions.target);

            /** Overwrite local storage value with updated state so we can potentially restore in
             * future sessions. */
            if (query.localStorage || query.sessionStorage) {
                query.saveToLocalStorage();
            }
        }

        /**
         * @ngdoc function
         * @name Query.saveToLocalStorage
         * @methodOf Query
         * @description
         * Save a snapshot of the current state to local/session storage so we can speed up calls
         * for data already residing on the users machine.
         */
        saveToLocalStorage(): void {
            //Don't use storage when running offline
            if (apConfig.offline) return;

            let model = this.getModel();
            let store = {
                changeToken: this.changeToken,
                indexedCache: this.getCache(),
                lastRun: this.lastRun
            }
            let stringifiedQuery = JSON.stringify(store);
            let storageType = this.localStorage ? 'local' : 'session';
            let localStorageKey = this.getLocalStorageKey();
            //Use try/catch in case we've exceeded browser storage limit (typically 5MB)
            try {
                if (this.localStorage) {
                    localStorage.setItem(localStorageKey, stringifiedQuery);
                } else {
                    sessionStorage.setItem(localStorageKey, stringifiedQuery);
                }
            } catch (e) {
                if (e.code == 22) {
                    // Storage full, maybe notify user or do some clean-up
                }
                apLogger.debug('Looks like we\'re out of space in ' + storageType + ' storage.', {
                    json: {
                        query: this.name,
                        model: this.getModel().list.title
                    }
                });
                if (this.localStorage) {
                    localStorage.clear();
                } else {
                    sessionStorage.clear();
                }
                //Disable storage for remainder of session to prevent throwing additional errors
                this.localStorage = false;
                this.sessionStorage = false;
            }
        }

        /** They key we use for local storage */
        private getLocalStorageKey() {
            var model = this.getModel();
            return model.getListId() + '.query.' + this.name;
        }
    }


    export class QueryFactory {
        Query = Query;
        static $inject = ['$q', 'apConfig', 'apDataService', 'apDefaultListItemQueryOptions', 'apIndexedCacheFactory', 'apDecodeService', 'apLogger'];

        constructor(_$q_, _apConfig_, _apDataService_, _apDefaultListItemQueryOptions_, _apIndexedCacheFactory_, _apDecodeService_, _apLogger_) {

            $q = _$q_;
            apConfig = _apConfig_;
            apDataService = _apDataService_;
            apDefaultListItemQueryOptions = _apDefaultListItemQueryOptions_;
            apIndexedCacheFactory = _apIndexedCacheFactory_;
            apDecodeService = _apDecodeService_;
            apLogger = _apLogger_;
        }

        /**
         * @ngdoc function
         * @name angularPoint.apQueryFactory:create
         * @methodOf angularPoint.apQueryFactory
         * @param {object} config Options object.
         * @param {object} model Reference to the model.
         * @description
         * Instantiates and returns a new Query.
         */
        create<T extends ListItem<any>>(config, model): IQuery<T> {
            return new Query<T>(config, model);
        }
    }

    /**
     * @ngdoc object
     * @name angularPoint.apQueryFactory
     * @description
     * Exposes the Query prototype and a constructor to instantiate a new Query.
     *
     * @requires angularPoint.apDataService
     * @requires angularPoint.apConfig
     */
    angular.module('angularPoint')
        .service('apQueryFactory', QueryFactory);


}
