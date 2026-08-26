# Deployment — what it does

The application ships as a container image built in one multi-stage pipeline and run behind a reverse proxy, with the
framework's own standalone output as the only thing copied into the final runtime stage.

## Decisions

A public-facing configuration value the framework freezes into the client bundle at build time — not read again at
container runtime — is supplied to the image build as a build argument rather than as a runtime environment variable
on the hosting platform. Setting it only at runtime would ship a client bundle carrying whatever value happened to be
present the moment the image was built, silently wrong for any deployment that expects to change it later without
rebuilding.

## Consequences

Changing this value for an already-built image means rebuilding and republishing that image; the hosting platform's
own runtime environment configuration has no effect on it, since the value is already compiled into the bundle by
the time a container starts.
