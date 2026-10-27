#!/bin/bash
set -e

SERVICE="${SERVICE_NAME:-$1}"
if [ $# -gt 0 ]; then
    shift
fi

if [ -z "$SERVICE" ]; then
    echo "ERROR: Please set SERVICE_NAME environment variable (e.g. case-service, transcription-service, user-service, config-service, notification-service, notebook-service, agent-garden, indexer-service)"
    exit 1
fi

WORKSPACE_DIR="/workspace/services"
if [ ! -d "$WORKSPACE_DIR" ] && [ -d "/workspace/backend" ]; then
    WORKSPACE_DIR="/workspace/backend"
fi

if [ ! -d "${WORKSPACE_DIR}/${SERVICE}" ]; then
    echo "ERROR: Service directory ${WORKSPACE_DIR}/${SERVICE} does not exist!"
    exit 1
fi

echo "=========================================================="
echo " Starting Quarkus Dev Mode for: ${SERVICE}"
echo " Hot reload enabled - watching ${WORKSPACE_DIR}/${SERVICE}"
echo "=========================================================="

cd "${WORKSPACE_DIR}"

mkdir -p /root/.m2

# Synchronize common-lib compilation across concurrent containers using flock
echo "Ensuring common-lib dependency is compiled and up to date..."
(
    flock -x 200
    mvn install -pl common-lib -am -DskipTests -Dquarkus.analytics.disabled=true
) 200>/root/.m2/.common-lib.lock

cd "${WORKSPACE_DIR}/${SERVICE}"

# Launch Quarkus dev mode with hot reload listening on all container interfaces
exec mvn quarkus:dev -Dquarkus.http.host=0.0.0.0 -Dquarkus.analytics.disabled=true -Ddebug=5005 "$@"
