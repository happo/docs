---
id: user-roles
title: Roles and permissions
---

The [user-access](https://happo.io/user-access) page for your Happo account
controls who has access to your account, and what priveleges those users have.

By default, these people will be have regular user access to your account:

- If you have a domain configured, any signed in user belonging to that domain
  (resolved by matching the host of the email address with the domain).
- Any users you have explicitly added to your account (listed in the "Users with
  access to the account" section).
- Users who have signed in with a GitHub account that have access to the
  repository or repositories you have integrated with the Happo account.

## User

A user can see reports and review them. They can also see API keys that they've
created themselves, and they have basic read-only access to things like
projects, component history, etc.

## Admin

An admin can do the following things that a regular user cannot:
- Manage subscriptions and edit billing related information.
- Manage projects and compare threshold settings.
- Set up integrations with source control (e.g. GitHub).
- Add and remove users and configure access control settings.
- Manage API keys.

