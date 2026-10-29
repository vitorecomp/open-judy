package org.openjudy.caseservice.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.caseservice.model.CaseDocument;
import org.openjudy.caseservice.model.JudicialCase;
import org.openjudy.caseservice.service.CaseService;
import org.openjudy.common.enums.LegalBranch;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Path("/api/v1/cases")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Cases & Documents", description = "Case management and attached judicial proceedings documents API")
public class CaseResource {

    @Inject
    CaseService caseService;

    @GET
    @Operation(summary = "List judicial cases with optional filtering")
    public List<JudicialCase> listCases(
            @QueryParam("search") String search,
            @QueryParam("status") String status,
            @QueryParam("branch") LegalBranch branch
    ) {
        return caseService.listCases(search, status, branch);
    }

    @GET
    @Path("/{id}")
    @Operation(summary = "Get case details by UUID including attached documents")
    public Response getCase(@PathParam("id") UUID id) {
        return caseService.getCase(id)
                .map(Response::ok)
                .orElse(Response.status(Response.Status.NOT_FOUND))
                .build();
    }

    @GET
    @Path("/number/{caseNumber}")
    @Operation(summary = "Get case by CNJ number")
    public Response getCaseByNumber(@PathParam("caseNumber") String caseNumber) {
        return caseService.getCaseByNumber(caseNumber)
                .map(Response::ok)
                .orElse(Response.status(Response.Status.NOT_FOUND))
                .build();
    }

    @POST
    @Operation(summary = "Register a new judicial case")
    public Response createCase(JudicialCase judicialCase) {
        JudicialCase created = caseService.createCase(judicialCase);
        return Response.status(Response.Status.CREATED).entity(created).build();
    }

    @PUT
    @Path("/{id}")
    @Operation(summary = "Update judicial case")
    public Response updateCase(@PathParam("id") UUID id, JudicialCase update) {
        return caseService.updateCase(id, update)
                .map(Response::ok)
                .orElse(Response.status(Response.Status.NOT_FOUND))
                .build();
    }

    @DELETE
    @Path("/all")
    @Operation(summary = "Clear all judicial cases")
    public Response clearAllCases() {
        caseService.clearAllCases();
        return Response.noContent().build();
    }

    @DELETE
    @Path("/{id}")
    @Operation(summary = "Delete judicial case")
    public Response deleteCase(@PathParam("id") UUID id) {
        boolean deleted = caseService.deleteCase(id);
        if (deleted) return Response.noContent().build();
        return Response.status(Response.Status.NOT_FOUND).build();
    }

    // =========================================================================
    // Case Documents Endpoints
    // =========================================================================

    @GET
    @Path("/{id}/documents")
    @Operation(summary = "List all documents associated with a case")
    public Response listDocuments(@PathParam("id") UUID id) {
        if (caseService.getCase(id).isEmpty()) {
            return Response.status(Response.Status.NOT_FOUND).build();
        }
        return Response.ok(caseService.listDocuments(id)).build();
    }

    @GET
    @Path("/{id}/documents/{docId}")
    @Operation(summary = "Get document metadata by case ID and document ID")
    public Response getDocument(@PathParam("id") UUID id, @PathParam("docId") UUID docId) {
        return caseService.getDocument(id, docId)
                .map(Response::ok)
                .orElse(Response.status(Response.Status.NOT_FOUND))
                .build();
    }

    @POST
    @Path("/{id}/documents")
    @Operation(summary = "Attach a new document to a judicial case")
    public Response addDocument(@PathParam("id") UUID id, CaseDocument document) {
        return caseService.addDocument(id, document)
                .map(doc -> Response.status(Response.Status.CREATED).entity(doc).build())
                .orElse(Response.status(Response.Status.NOT_FOUND).build());
    }

    @DELETE
    @Path("/{id}/documents/{docId}")
    @Operation(summary = "Remove a document from a case")
    public Response deleteDocument(@PathParam("id") UUID id, @PathParam("docId") UUID docId) {
        boolean removed = caseService.deleteDocument(id, docId);
        if (removed) return Response.noContent().build();
        return Response.status(Response.Status.NOT_FOUND).build();
    }
}
