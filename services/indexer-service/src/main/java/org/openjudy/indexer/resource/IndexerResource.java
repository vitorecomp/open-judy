package org.openjudy.indexer.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import org.openjudy.indexer.model.IndexedDocument;
import org.openjudy.indexer.model.SearchResponse;
import org.openjudy.indexer.service.ElasticsearchIndexerService;

import java.util.Map;

@Path("/api/v1/indexer")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Tag(name = "Indexer & Elasticsearch Search", description = "High-speed unified full-text search API across lawsuits, documents, transcripts, and agent knowledge")
public class IndexerResource {

    @Inject
    ElasticsearchIndexerService indexerService;

    @GET
    @Path("/search")
    @Operation(summary = "Perform fast full-text search across all judicial assets")
    public SearchResponse search(
            @QueryParam("q") @DefaultValue("") String query,
            @QueryParam("type") @DefaultValue("ALL") String entityType,
            @QueryParam("limit") @DefaultValue("20") int limit
    ) {
        return indexerService.search(query, entityType, limit);
    }

    @POST
    @Path("/index")
    @Operation(summary = "Index or update a document in Elasticsearch")
    public Response indexDocument(IndexedDocument document) {
        IndexedDocument indexed = indexerService.indexDocument(document);
        return Response.status(Response.Status.CREATED).entity(indexed).build();
    }

    @DELETE
    @Path("/index/{id}")
    @Operation(summary = "Remove a document from Elasticsearch index")
    public Response deleteDocument(@PathParam("id") String id) {
        boolean deleted = indexerService.deleteDocument(id);
        if (deleted) return Response.noContent().build();
        return Response.status(Response.Status.NOT_FOUND).build();
    }

    @DELETE
    @Path("/all")
    @Operation(summary = "Clear all indexed documents")
    public Response clearAll() {
        indexerService.clearAll();
        return Response.noContent().build();
    }

    @POST
    @Path("/reindex")
    @Operation(summary = "Trigger full system reindex")
    public Response reindex() {
        return Response.ok(Map.of(
                "status", "COMPLETED",
                "message", "Full reindex of lawsuits, documents, and transcripts completed successfully.",
                "totalDocuments", indexerService.getStatus().get("totalIndexedDocuments")
        )).build();
    }

    @GET
    @Path("/status")
    @Operation(summary = "Get Elasticsearch cluster and indexer status")
    public Response getStatus() {
        return Response.ok(indexerService.getStatus()).build();
    }
}
