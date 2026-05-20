# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of TelecomChat seriously. If you believe you have found a
security vulnerability, please **do not** open a public issue.

Instead, send a private report to:

**contact@mateocardenas.dev**

Please include the following details:

- Type of vulnerability
- Steps to reproduce
- Affected version(s)
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment:** within 48 hours
- **Initial assessment:** within 5 business days
- **Fix / Mitigation:** depends on severity (typically 7–30 days)
- **Public disclosure:** after a fix has been released

We ask that you allow us a reasonable time to address the issue before any
public disclosure.

## Scope

This security policy covers:

- The `telecom-engine` core package
- The `server` backend package  
- The `client` frontend package
- CI/CD pipelines in `.github/`
- Dependencies managed via npm

## Best Practices

- Always run `npm audit` after installing dependencies
- Keep Node.js updated to the latest LTS (20.x)
- Review Dependabot PRs promptly
- Do not commit `.env` files or secrets
- Use `npm ci` (not `npm install`) in production builds
