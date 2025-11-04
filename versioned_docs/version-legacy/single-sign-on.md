---
id: single-sign-on
title: SSO (Single sign-on)
---

To simplify access to Happo you can let users sign in to Happo using your own
Identity Provider (IdP) using the SAML protocol. This guide will provide
step-by-step instructions on how to configure different Identity Providers. If
you can't find your Identity Provider here and the general instructions aren't
specific enough to get you through the setup, don't hesitate to reach out to us
at support@happo.io and we will provide hands-on assistance.

## General instructions

The following section provides high-level instructions to how the SAML
integration works with Happo. More specific instructions are available further
down in the article.

### Happo setup

The SSO settings for Happo are available on
[the Access Control page](https://happo.io/user-access) for your Happo account.
If you haven't already done so, you need to reach out to Happo to unlock the
settings for your account.

There are 5 fields to fill in:

#### Domain

When users initiate a SSO sign-in without the context of a Happo account, we
first ask them to identify the account using a domain. Once that step is done,
we initiate the sign-in over on the IdP that you have configured. The domain
isn't always needed to initiate the sign-in, as in the case of a user landing on
a URL leading directly to a Happo report for a Happo account.

#### Issuer ID

This field is usually provided to you from your IdP when you configure/add Happo
as an application. But it can also be something you choose yourself. In case the
IdP doesn't provide one for you, try using
`https://happo.io/auth/a/<accountId>/sso/entityID` here (where `<accountId>` is
your Happo account ID -- find it in the location bar when in the account
dashboard).

#### Entry point

This URL is provided by your IdP. It's sometimes called "SSO URL", "Entry point
URL" or something similar.

#### Logout URL

If your IdP supports Single Log-Out (SLO), you can enter the logout URL here. If
not, simply set this to `https://happo.io`.

#### Certificate

Happo will verify all incoming SSO requests using the public key provided by
your IdP. Happo validates the assertion signature, not the response signature.

### Roles

When an SSO session is successful, Happo will assign the user one or more of
three roles:

- Regular user
- Administrator
- Reviewer

By default, all users that are allowed to sign in via SSO are considered Regular
users. These users have access to and can review reports, and they have basic
access to some other account specific pages (like the dashboard).

If Happo finds a "roles" attribute in the incoming SAML data, we will look for
the strings "Happo Admin" and "Happo Reviewer". The lookup is case-sensitive, so
make sure capitalization is right. If "Happo Admin" is found, the user is made
an administrator of the Happo account.

If the Happo account is configured to only allow reviewing to be done by users
with the "Reviewer" role, setting the "Happo Reviewer" role to certain users
will be required.

## Google GSuite

Here are instructions for using Google as an IdP. First of all, you need to sign
in to [your Google Admin Console](https://admin.google.com/ac/home).

### Setup on the Google side

Before we go on and add a Custom SAML app, we're going to update the user schema
to add a custom `roles` attribute that we can use for Happo.

#### Creating a custom `roles` attribute

Go to
https://developers.google.com/admin-sdk/directory/reference/rest/v1/schemas/insert#try-it
and enter `my_customer` as the `customerId` and paste the following as the
Request body:

```json
{
  "fields": [
    {
      "fieldName": "roles",
      "fieldType": "STRING",
      "readAccessType": "ADMINS_AND_SELF",
      "multiValued": true,
      "displayName": "roles"
    }
  ],
  "schemaName": "Happo",
  "displayName": "Happo"
}
```

Press `Execute` and verify that the response is 200 and is shown in green.

Now that we have the new custom role, we can assign it to the right users.
Repeat the following for all users that you want to be Happo Admins:

Go to
https://developers.google.com/admin-sdk/directory/reference/rest/v1/users/patch
Enter the email address of the user you want to have the Happo Admin role as the
`userKey`. Then paste this in the body:

```json
{
  "customSchemas": {
    "Happo": {
      "roles": [
        {
          "value": "Happo Admin",
          "type": "custom",
          "customType": "Happo"
        }
      ]
    }
  }
}
```

Press `Execute` and verify that the response is 200 and is shown in green.

Now that we have the custom `roles` attribute, it's time to add a new Custom
SAML App in Google. Go to
[_Apps > Web and mobile apps_](https://admin.google.com/ac/apps/unified).

#### Creating a SAML app

##### App details

Press "Add app" and select "Add custom SAML app". In the form that follows,
Enter "Happo" as the app name and provide a description of your choice. If you
want to add an App icon, here's one that you can use:
https://happo.io/static/happo-hippo.png.

##### Google Identity Provider details

In the next screen, you'll have a chance to copy some things you will need
later:

- SSO URL
- Certificate

You can ignore the Entity ID here, we'll provide our own later on.

##### Service provider details

The Service provider here is Happo, so here we'll need some Happo specific
values.

For `ACS URL`, enter `https://happo.io/auth/a/<accountId>/sso/callback` where
`<accountId>` is the ID of your Happo account (go to the Happo dashboard and
copy it from the URL in the location bar).

For `Entity ID`, enter `https://happo.io/auth/a/<accountId>/sso/entityID` where
again, `accountId` is the ID of your Happo account.

Leave `Start URL` empty and `Signed response` unchecked. Also leave `Name ID`
untouched.

##### Attribute mapping

You'll need two custom attribute mappings: `emailaddress` and `roles`.

Select `Basic information > Primary email` and map it to the string
`emailaddress`.

Select `Happo > roles` and map it to the string `roles`.

Submit the form to finalize the setup of the Custom SAML app. Your setup is now
all done from the Google side of things, and it's time to configure things on
the Happo side.

### Setup on the Happo side

On the [Access Control page](https://happo.io/user-access) for your Happo
account, enter the following properties in the SSO form:

- **Domain**: Your own domain, e.g. `example.com`. The domain is used to
  associate an SSO sign-in with a Happo account.

- **Issuer ID**: Enter `https://happo.io/auth/a/<accountId>/sso/entityID`, where
  `<accountId>` is your Happo account ID. This URL needs to be the same one you
  configured on the Google side, as the `Entity ID`.

- **Entry point**: Copy-paste the SSO URL from the SAML metadata on the Google
  side.

- **Logout URL**: https://happo.io/ (Google doesn't support SLO, so we just
  direct people to the start page when they sign out)

- **Certificate**: Copy-paste the Certificate from the SAML metadata on the
  Google side.

## Okta

Here's a guide on how to use Okta as the IdP. Please note that these
instructions are for a regular Okta application. If you're using Auth0, please
use [Auth0 specific instructions](#auth0-by-okta).

### Setup on the Okta side

#### Create Happo application

First, we're going to create a new App Integration in Okta. When you're signed
in to your Okta dashboard, go to "Applications > Applications" and click on
"Create App Integration". In the dialog that opens, select "Saml 2.0" as the
Sign-in method. Click "Next" and enter the following in the form that appears:

- **App name**: Happo
- **App logo**: Download the Happo hippo from
  [https://happo.io/static/happo-hippo.png](https://happo.io/static/happo-hippo.png)
  and upload it here.

Click "Next".

#### Configure SAML settings

In the "Configure SAML" tab, enter the following values:

- **Single sign-on URL** -- Enter
  `https://happo.io/auth/a/<accountId>/sso/callback` here, where `<accoundId>`
  is the ID of your Happo account. To find the account ID, go to your Happo
  dashboard and copy the numeric ID from the location bar URL.
- **Audience URI** -- Enter any URI that will validate the form here, e.g.
  "http://happo.io". We will come back and change this later.
- Under **Attribute Statements**, set Name to `emailaddress` and select
  `user.email` as the Value.

Finish the SAML settings by going through the "Feedback" section and clicking
"Finish".

#### Transfer issuer URI to Audience URI

In the "Sign On" tab for the Happo application you've just created in Okta,
click "More details" in the SAML 2.0 box. Copy the value for `Issuer` and go
back to Configure SAML settings via the "General" tab followed by clicking the
"Edit" button in the "SAML settings" box. Click "Next" to skip to the "Configure
SAML" tab.

Paste the `Issuer` value into the `Audience URI` field and save that change.

#### Assign users to Happo application

To allow people to sign in to Happo, you need to assign them to it. In the
"Assignments" tab of the Happo application in Okta, click the "Assign" button
and select either specific users to assign the app to or a group assignment.

#### Prepare metadata values

Before continuing to configuring the Happo side of things, expand the SAML 2.0
metadata by going to the "Sign On" tab for the Happo application in Okta, and
click "More details" to expand and see all values in the "SAML 2.0" section.
We're going to use these values next.

### Setup on the Happo side

On the [Access Control page](https://happo.io/user-access) for your Happo
account, enter the following properties in the SSO form:

- **Domain**: Your own domain, e.g. `example.com`. The domain is used to
  associate an SSO sign-in with a Happo account.

- **Issuer ID**: Copy-paste the "Issuer" value that you have in the SAML 2.0
  section on the Okta side.

- **Entry point**: Copy-paste the "Sign on URL" from the SAML 2.0 section on the
  Okta side.

- **Logout URL**: Copy-paste the "Sign out URL" from the SAML 2.0 section on the
  Okta side.

- **Certificate**: Download the "Signing certificate" from the SAML 2.0 section
  on the Okta side. Open the file and copy-paste all text, including the
  "-----BEGIN CERTIFICATE-----" and "-----END CERTIFICATE-----" parts.

## Auth0 by Okta

Here's a guide on how to use Auth0 as the IdP. Please note that these
instructions do not apply to a regular Okta application. If you're not using
Auth0, use [the standard Okta instructions](#okta) instead.

### Setup on the Auth0 side

#### Create Happo application

First, we're going to create an app in Auth0. When you're signed in to your
Auth0 dashboard, go to "Applications > Applications" and click on "Create
Application". In the form that opens, enter "Happo" (or something similar) as
the name of the application and select "Regular Web Application" as the
application type.

#### Enable the SAML2 Web App addon

Under "Addons" for the new application you just created, enable "SAML2 Web App".
Copy the following properties:

- **Issuer** -- We're going to use that on the Happo side as the Issuer ID.
- **Identity Provider Login URL** -- This is the Entry point we need for Happo.
- Download the **Identity Provider Certificate**. We're going to use that on the
  Happo side later.

#### Configure the callback URL

In the SAML2 Web App dialog, switch to the "Settings" tab. Under **Application
Callback URL**, enter `https://happo.io/auth/a/<accountId>/sso/callback`, where
`<accountId>` is the ID of your Happo account. To find the account ID, go to
your Happo dashboard and copy the numeric ID from the location bar URL.

Scroll down and Save/Enable the SAML2 Web App settings.

#### Add Happo as allowed logout URL

In your Auth0 dashboard, go to the general "Settings" page (sometimes called
"Tenant Settings"). You can click the link in the sidebar menu that says
"Settings". Go to the "Advanced" tab. Under "Allowed logout URLs" add
`https://happo.io/`. Save the new settings.

#### Adding Happo specific roles

To add roles that Happo recognize, you can use the Authorization Extension in
Auth0. From the Auth0 dashboard, click "Authorization" in the sidebar menu. The
Authorization Extension will load for you. Once loaded, click on "Roles" in the
sidebar menu, then use the "Create role" button. In the form that opens, enter
the following values:

- **Application**: Select "Happo", then click "Next"
- **Name**: Enter `Happo Admin` (make sure capitalization is correct as this
  value is case-sensitive).
- **Description**: Type "A Happo Admin can manage the Happo account" or
  something similar.

Press "Save" to add the new role. Then go ahead and assign this role to the
right users. When they sign in to Happo, they will have admin abilities.

If your Happo account is set to only allow specific users to review reports, you
can repeat the above steps for a `Happo Reviewer` role as well.

### Setup on the Happo side

On the [Access Control page](https://happo.io/user-access) for your Happo
account, enter the following properties in the SSO form:

- **Domain**: Your own domain, e.g. `example.com`. The domain is used to
  associate an SSO sign-in with a Happo account.

- **Issuer ID**: Copy-paste the "Issuer" value that you got from Auth0 in the
  SAML2 Web App dialog.

- **Entry point**: Copy-paste the "Identity Provider Login URL" from the SAML2
  Web App dialog on the Auth0 side.

- **Logout URL**: Enter
  `https://<tenantId>.us.auth0.com/v2/logout?returnTo=https%3A%2F%2Fhappo.io%2F`
  where `<tenantId>` is the ID of your auth0 account. You can copy the
  `tenantId` from the Entry point URL. As an example, if the Entry point URL is
  `https://dev-ggwmzlinwh00kyt8.us.auth0.com/samlp/ISFXPSqXuSXekpqBwXzZdqnmRpmQHvAO`
  the Logout URL is going to be
  `https://dev-ggwmzlinwh00kyt8.us.auth0.com/v2/logout?returnTo=https%3A%2F%2Fhappo.io%2F`

- **Certificate**: Copy-paste the Certificate from the file you downloaded from
  the SAML2 Web App dialog on the Auth0 side.

## EntraID (Azure AD)

Here's a guide on how to use EntraID as the IdP.

### Setup on the EntraID side

First, we're going to register an Enterprise Application and configure it in
EntraID.

#### Registering an Enterprise Application

1. Go to the Microsoft Entra Admin Center.
2. Navigate to **Identity → Applications → Enterprise applications**.
3. Click **+ New application → Create your own application**.
4. Name it (e.g., "Happo SAML Login") and select "Integrate any other
   application you don’t find in the gallery (Non-gallery)".
5. Click **Create**.

#### Configuring SAML Authentication

1. Inside the newly created application, go to **Single sign-on** → Select
   **SAML**.
2. Basic SAML Configuration:
   - **Identifier (Entity ID)**: Set this to a unique identifier for your
     service, such as `https://happo.io/saml/metadata`.
   - **Reply URL (Assertion Consumer Service URL)**: Enter
     `https://happo.io/auth/a/<accountId>/sso/callback` here, where
     `<accoundId>` is the ID of your Happo account. To find the account ID, go
     to your Happo dashboard and copy the numeric ID from the location bar URL.
   - **Sign on URL**: Set it to `https://happo.io/login`.

#### Assign users to Happo application

To allow people to sign in to Happo, you need to assign them to it. In the
"Users & Groups" page of the Enterprise Application you created, add the users
that you want to have access to Happo.

### Setup on the Happo side

On the [Access Control page](https://happo.io/user-access) for your Happo
account, enter the following properties in the SSO form:

- **Domain**: Your own domain, e.g. `example.com`. The domain is used to
  associate an SSO sign-in with a Happo account.

- **Issuer ID**: Enter the same value as you did for **Identifier (Entity ID)**
  over at EntraID (e.g. `https://happo.io/saml/metadata`)

- **Entry point**: Copy-paste the value for **Login URL** that you find in
  EntraID for the SAML application you created, in section "Set Up SAML Login"

- **Logout URL**: Enter `https://happo.io/` here

- **Certificate**: Download the **Certificate (Base64)** file from EntraID for
  the SAML application you created and copy-paste its content here. The content
  should start with "-----BEGIN CERTIFICATE-----" and end with "-----END
  CERTIFICATE-----".

Save these settings and you should be able to sign in to Happo using EntraID.

## Testing

Once you have configured both the IdP and Happo, you can test the integration by
attempting an SSO sign-in. There are two sign-in flows that your users might be
taken to:

### The global sign-in page

When users click the "Sign in" link in the navbar, we show them the global
sign-in page. This page has a "Continue with SSO" button. When you click that
button you are asked to enter the domain of the Happo account, e.g.
`example.com`. Users are then directed to the SSO flow for the IdP associated
with that domain. Try entering your domain and continue signing in for a user in
your directory. On successful login, the user should see a "Dashboard" link in
the navbar, and they should be able to access that page.

### The account-specific sign-in page

When users land on a direct URL to a report, we know what account they are
trying to sign in to, so there's no need for the intermediate "Enter domain"
step. Users land directly on the sign-in page for the IdP associated with the
Happo account.

To get a direct link to a report, go to the Dashboard, and copy a URL to a
"Comparison" or a "Report". Use this URL in a signed-out state to try the
account-specific sign-in flow.

### When things go wrong

Don't hesitate to reach out to Happo support at support@happo.io if you are
unable to complete the setup or if you run into issues along the way. We can
debug things for you and point in the right direction.
