package org.openjudy.caseservice.resource;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.core.UriInfo;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Path("/api/v1")
@ApplicationScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class TaskAuditResource {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private String baseUrl() {
        return System.getenv().getOrDefault("TASK_AUDIT_SERVICE_URL", "http://task-audit-service:8091");
    }

    private Response proxyGet(String path, UriInfo uriInfo) {
        String rawQuery = uriInfo != null && uriInfo.getRequestUri() != null ? uriInfo.getRequestUri().getRawQuery() : null;
        String url = baseUrl() + path + (rawQuery != null && !rawQuery.isBlank() ? "?" + rawQuery : "");
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            return Response.status(resp.statusCode()).entity(resp.body()).type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                    .entity("{\"error\":\"" + e.getMessage() + "\"}")
                    .type(MediaType.APPLICATION_JSON)
                    .build();
        }
    }

    private Response proxyPost(String path, String body) {
        String url = baseUrl() + path;
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(body != null && !body.isBlank() ? body : "{}"))
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            return Response.status(resp.statusCode()).entity(resp.body()).type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                    .entity("{\"error\":\"" + e.getMessage() + "\"}")
                    .type(MediaType.APPLICATION_JSON)
                    .build();
        }
    }

    @GET
    @Path("/tasks")
    public Response listTasks(@Context UriInfo uriInfo) {
        return proxyGet("/api/v1/tasks", uriInfo);
    }

    @GET
    @Path("/tasks/stats")
    public Response getTaskStats(@Context UriInfo uriInfo) {
        return proxyGet("/api/v1/tasks/stats", uriInfo);
    }

    @GET
    @Path("/tasks/queues")
    public Response getTaskQueues(@Context UriInfo uriInfo) {
        return proxyGet("/api/v1/tasks/queues", uriInfo);
    }

    @POST
    @Path("/tasks/dispatch")
    public Response dispatchTask(String body) {
        return proxyPost("/api/v1/tasks/dispatch", body);
    }

    @POST
    @Path("/tasks/{taskId}/retry")
    public Response retryTask(@PathParam("taskId") String taskId, String body) {
        return proxyPost("/api/v1/tasks/" + taskId + "/retry", body);
    }

    @GET
    @Path("/audit")
    public Response getAuditRoot(@Context UriInfo uriInfo) {
        return proxyGet("/api/v1/audit", uriInfo);
    }

    @GET
    @Path("/audit/logs")
    public Response getAuditLogs(@Context UriInfo uriInfo) {
        return proxyGet("/api/v1/audit/logs", uriInfo);
    }

    @GET
    @Path("/audit/stats")
    public Response getAuditStats(@Context UriInfo uriInfo) {
        return proxyGet("/api/v1/audit/stats", uriInfo);
    }

    @POST
    @Path("/audit/events")
    public Response recordAuditEvent(String body) {
        return proxyPost("/api/v1/audit/events", body);
    }

    @GET
    @Path("/prompts")
    public Response getPromptsAlias(@Context UriInfo uriInfo) {
        String configUrl = System.getenv().getOrDefault("CONFIG_SERVICE_URL", "http://config-service:8086");
        String rawQuery = uriInfo != null && uriInfo.getRequestUri() != null ? uriInfo.getRequestUri().getRawQuery() : null;
        String url = configUrl + "/api/v1/config/prompts" + (rawQuery != null && !rawQuery.isBlank() ? "?" + rawQuery : "");
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            return Response.status(resp.statusCode()).entity(resp.body()).type(MediaType.APPLICATION_JSON).build();
        } catch (Exception e) {
            return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                    .entity("{\"error\":\"" + e.getMessage() + "\"}")
                    .type(MediaType.APPLICATION_JSON)
                    .build();
        }
    }
}
