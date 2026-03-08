# Backend dev notes

## Photo proxy quick check

```bash
curl -I "https://api.perbug.com/photos?name=places/.../photos/...&maxWidthPx=800"
```

## Identity + profile architecture notes

### New/updated APIs

- `GET /v1/identity`
- `GET /v1/identity/contexts`
- `POST /v1/identity/context/switch`
- `GET /v1/identity/permissions`
- `POST /v1/profiles/creator`
- `POST /v1/profiles/business`
- `GET /v1/business-profiles/:businessProfileId/members`
- `POST /v1/business-profiles/:businessProfileId/members`

### Compatibility assumptions

- Existing content and routes that key by `x-user-id` remain supported.
- Review attribution now stores both `userId` (audit) and acting profile fields (`actingProfileType`, `actingProfileId`).
- Subscription resolution is context-aware when acting-as headers are present:
  - personal -> user account subscription
  - creator -> creator profile subscription target
  - business -> business profile subscription target

### Backfill/seed guidance

- For every existing auth user, create:
  - one `users` row
  - one `personal_profiles` row
  - one default `user_roles` row (`USER`)
- If legacy creator metadata exists, map into `creator_profiles` and assign `CREATOR` role.
- If legacy merchant/business ownership exists, map into `business_profiles` + `business_memberships` with `OWNER` role.

### Example responses

`GET /v1/identity`

```json
{
  "user": {
    "id": "user_123",
    "status": "ACTIVE",
    "activeProfileType": "PERSONAL",
    "activeProfileId": "pp_abc"
  },
  "roles": ["USER", "CREATOR"],
  "personalProfile": {
    "id": "pp_abc",
    "userId": "user_123",
    "displayName": "Perbug User"
  },
  "creatorProfile": {
    "id": "cp_abc",
    "userId": "user_123",
    "creatorName": "My Creator Brand"
  },
  "businessProfiles": [
    {
      "id": "bp_abc",
      "slug": "my-business",
      "businessName": "My Business"
    }
  ]
}
```

`GET /v1/identity/contexts`

```json
{
  "contexts": [
    { "profileType": "PERSONAL", "profileId": "pp_abc" },
    { "profileType": "CREATOR", "profileId": "cp_abc" },
    { "profileType": "BUSINESS", "profileId": "bp_abc" }
  ]
}
```

`POST /v1/identity/context/switch`

```json
{
  "actor": {
    "userId": "user_123",
    "profileType": "BUSINESS",
    "profileId": "bp_abc",
    "roles": ["USER", "BUSINESS_OWNER"],
    "businessMembershipRole": "OWNER"
  }
}
```

`GET /v1/business-profiles/bp_abc/members`

```json
{
  "members": [
    {
      "id": "bm_1",
      "businessProfileId": "bp_abc",
      "userId": "user_123",
      "role": "OWNER",
      "status": "ACTIVE"
    },
    {
      "id": "bm_2",
      "businessProfileId": "bp_abc",
      "userId": "user_456",
      "role": "MANAGER",
      "status": "ACTIVE"
    }
  ]
}
```

Permission denied envelope (example)

```json
{
  "decision": {
    "allowed": false,
    "reasonCode": "ROLE_REQUIRED",
    "message": "Role cannot post replies",
    "requiredRole": "EDITOR"
  }
}
```
