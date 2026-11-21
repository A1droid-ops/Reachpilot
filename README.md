# ReachPilot — Starter Website

A simple, responsive outreach workspace built with plain HTML, CSS and JavaScript.

## Included

- Responsive dashboard layout
- Lead management: add, search, delete and CSV import
- Campaign draft creation and deletion
- Reusable email templates
- Gmail integration setup information (not connected yet)
- Browser-local persistence using `localStorage`

## Run the website

### Easiest option
1. Extract `reachpilot-website.zip`.
2. Open the extracted folder.
3. Double-click `index.html`.
4. It should open in your browser.

For a more reliable local preview, you can use a simple static server, but it is not required for this starter.

## Important limitations

This is a frontend starter, not a production email-sending system.

- No real Gmail accounts are connected.
- No emails are sent.
- Data is stored only in the current browser on the current device.
- Browser data can be lost if site data is cleared.
- There is no user login, shared database, backend, or server-side token storage yet.

Do not put Google OAuth client secrets, Gmail passwords, or access tokens in these files.

## Suggested next development stages

1. Add a secure backend and database.
2. Add user authentication and per-user data access.
3. Implement Google OAuth on the server for multiple Gmail accounts.
4. Add Gmail API sending with appropriate quotas, consent controls, unsubscribe handling and suppression checks.
5. Add safe server-side scheduling and reply processing.
6. Deploy to a free-tier host after checking its current limits.
