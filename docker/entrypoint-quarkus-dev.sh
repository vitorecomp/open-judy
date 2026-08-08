#!/bin/bash
set -e

SERVICE="${SERVICE_NAME:-$1}"
if [ $# -gt 0 ]; then
    shift
fi

if [ -z "$SERVICE" ]; then
    echo "ERROR: Please set SERVICE_NAME environment variable (e.g. case-service, media-service, etc.)"
    exit 1
fi

echo "=========================================================="
echo " Starting Quarkus Dev Mode for: ${SERVICE}"
echo " Hot reload enabled - watching /workspace/backend/${SERVICE}"
echo "=========================================================="

cd /workspace/backend

# Ensure common-lib is compiled into local m2 repository if needed
if [ ! -d "/root/.m2/repository/org/openjudy/common-lib" ]; then
    echo "Compiling common-lib dependency..."
    mvn install -pl common-lib -am -DskipTests
fi

cd "/workspace/backend/${SERVICE}"

# Launch Quarkus dev mode with hot reload listening on all container interfaces
exec mvn quarkus:dev -Dquarkus.http.host=0.0.0.0 "$@"
