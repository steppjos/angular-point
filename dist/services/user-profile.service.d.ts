import { DataService } from './dataservice.service';
import { Observable } from 'rxjs/Observable';
/**
 * @ngdoc service
 * @name angularPoint.UserProfileService
 * @description
 * Simple service that allows us to request and cache both the current user and their group memberships.
 *
 * @requires DataService
 *
 */
export declare class UserProfileService {
    private dataService;
    constructor(dataService: DataService);
    /**
     * @ngdoc function
     * @name angularPoint.UserProfileService:checkIfMember
     * @methodOf angularPoint.UserProfileService
     * @description
     * Checks to see if current user is a member of the specified group.
     * @param {string} groupName Name of the group.
     * @returns {Observable<IXMLGroup>} Returns the group definition if the user is a member. {ID:string, Name:string, Description:string, OwnerId:string, OwnerIsUser:string}
     * @example
     * <pre>{ID: "190", Name: "Blog Contributors", Description: "We are bloggers...", OwnerID: "126", OwnerIsUser: "False"}</pre>
     */
    checkIfMember(groupName: string): Observable<IXMLGroup>;
    /**
     * @ngdoc function
     * @name angularPoint.UserProfileService:getGroupCollection
     * @methodOf angularPoint.UserProfileService
     * @description
     * Returns the group definitions for the current user and caches results.
     * @returns {Observable<IXMLGroup[]>} Observable which resolves with the array of groups the user belongs to.
     */
    getGroupCollection(): Observable<IXMLGroup[]>;
    /**
     * @ngdoc function
     * @name angularPoint.UserProfileService:getUserProfile
     * @methodOf angularPoint.UserProfileService
     * @description
     * Returns the user profile for the current user and caches results.
     * Pull user profile info and parse into a profile object
     * http://spservices.codeplex.com/wikipage?title=GetUserProfileByName
     * @returns {Observable<IXMLUserProfile>} Observable which resolves with the requested user profile.
     */
    getUserProfile(): Observable<IXMLUserProfile>;
}
export interface IXMLGroup {
    Description: string;
    ID: string;
    Name: string;
    OwnerID: string;
    OwnerIsUser: string;
}
export interface IXMLUser {
    Email: string;
    Flags: string;
    ID: string;
    IsDomainGroup: string;
    IsSiteAdmin: string;
    LoginName: string;
    Name: string;
    Notes: string;
    Sid: string;
}
export interface IXMLUserProfile {
    userLoginName: string;
    UserProfile_GUID: string;
    AccountName: string;
    FirstName: string;
    'SPS-PhoneticFirstName': string;
    LastName: string;
    'SPS-PhoneticLastName': string;
    PreferredName: string;
    'SPS-PhoneticDisplayName': string;
    WorkPhone: string;
    Department: string;
    Title: string;
    'SPS-JobTitle': string;
    Manager: string;
    AboutMe: string;
    PersonalSpace: string;
    PictureURL: string;
    UserName: string;
    QuickLinks: string;
    WebSite: string;
    PublicSiteRedirect: string;
    'SPS-Dotted-line': string;
    'SPS-Peers': string;
    'SPS-Responsibility': string;
    'SPS-SipAddress': string;
    'SPS-MySiteUpgrade': string;
    'SPS-DontSuggestList': string;
    'SPS-ProxyAddresses': string;
    'SPS-HireDate': string;
    'SPS-DisplayOrder': string;
    'SPS-ClaimID': string;
    'SPS-ClaimProviderID': string;
    'SPS-ClaimProviderType': string;
    'SPS-LastColleagueAdded': string;
    'SPS-OWAUrl': string;
    'SPS-SavedAccountName': string;
    'SPS-ResourceAccountName': string;
    'SPS-ObjectExists': string;
    'SPS-MasterAccountName': string;
    'SPS-DistinguishedName': string;
    'SPS-SourceObjectDN': string;
    'SPS-LastKeywordAdded': string;
    WorkEmail: string;
    CellPhone: string;
    Fax: string;
    HomePhone: string;
    Office: string;
    'SPS-Location': string;
    'SPS-TimeZone': string;
    Assistant: string;
    'SPS-PastProjects': string;
    'SPS-Skills': string;
    'SPS-School': string;
    'SPS-Birthday': string;
    'SPS-StatusNotes': string;
    'SPS-Interests': string;
    'SPS-EmailOptin': string;
}
