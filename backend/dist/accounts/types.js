export var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
})(UserStatus || (UserStatus = {}));
export var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["CREATOR"] = "CREATOR";
    UserRole["BUSINESS_OWNER"] = "BUSINESS_OWNER";
    UserRole["BUSINESS_MANAGER"] = "BUSINESS_MANAGER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["MODERATOR"] = "MODERATOR";
})(UserRole || (UserRole = {}));
export var ProfileType;
(function (ProfileType) {
    ProfileType["PERSONAL"] = "PERSONAL";
    ProfileType["CREATOR"] = "CREATOR";
    ProfileType["BUSINESS"] = "BUSINESS";
})(ProfileType || (ProfileType = {}));
export var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["UNVERIFIED"] = "UNVERIFIED";
    VerificationStatus["PENDING"] = "PENDING";
    VerificationStatus["VERIFIED"] = "VERIFIED";
})(VerificationStatus || (VerificationStatus = {}));
export var CreatorProfileStatus;
(function (CreatorProfileStatus) {
    CreatorProfileStatus["ACTIVE"] = "ACTIVE";
    CreatorProfileStatus["PENDING"] = "PENDING";
    CreatorProfileStatus["HIDDEN"] = "HIDDEN";
    CreatorProfileStatus["SUSPENDED"] = "SUSPENDED";
})(CreatorProfileStatus || (CreatorProfileStatus = {}));
export var ProfileVisibility;
(function (ProfileVisibility) {
    ProfileVisibility["PRIVATE"] = "PRIVATE";
    ProfileVisibility["PUBLIC"] = "PUBLIC";
})(ProfileVisibility || (ProfileVisibility = {}));
export var BusinessMembershipRole;
(function (BusinessMembershipRole) {
    BusinessMembershipRole["OWNER"] = "OWNER";
    BusinessMembershipRole["MANAGER"] = "MANAGER";
    BusinessMembershipRole["EDITOR"] = "EDITOR";
    BusinessMembershipRole["VIEWER"] = "VIEWER";
})(BusinessMembershipRole || (BusinessMembershipRole = {}));
export var MembershipStatus;
(function (MembershipStatus) {
    MembershipStatus["ACTIVE"] = "ACTIVE";
    MembershipStatus["INVITED"] = "INVITED";
    MembershipStatus["DISABLED"] = "DISABLED";
})(MembershipStatus || (MembershipStatus = {}));
export var PermissionAction;
(function (PermissionAction) {
    PermissionAction["CREATE_CREATOR_PROFILE"] = "CREATE_CREATOR_PROFILE";
    PermissionAction["ACT_AS_PROFILE"] = "ACT_AS_PROFILE";
    PermissionAction["EDIT_CREATOR_PROFILE"] = "EDIT_CREATOR_PROFILE";
    PermissionAction["MANAGE_BUSINESS_MEMBERS"] = "MANAGE_BUSINESS_MEMBERS";
    PermissionAction["BUSINESS_REPLY"] = "BUSINESS_REPLY";
    PermissionAction["PUBLISH_CREATOR_CONTENT"] = "PUBLISH_CREATOR_CONTENT";
    PermissionAction["ACCESS_BUSINESS_ANALYTICS"] = "ACCESS_BUSINESS_ANALYTICS";
})(PermissionAction || (PermissionAction = {}));
