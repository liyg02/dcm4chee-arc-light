/*
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 *  The contents of this file are subject to the Mozilla Public License Version
 *  1.1 (the "License"); you may not use this file except in compliance with
 *  the License. You may obtain a copy of the License at
 *  http://www.mozilla.org/MPL/
 *
 *  Software distributed under the License is distributed on an "AS IS" basis,
 *  WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 *  for the specific language governing rights and limitations under the
 *  License.
 *
 *  The Original Code is part of dcm4che, an implementation of DICOM(TM) in
 *  Java(TM), hosted at https://github.com/dcm4che.
 *
 *  The Initial Developer of the Original Code is
 *  J4Care.
 *  Portions created by the Initial Developer are Copyright (C) 2015-2017
 *  the Initial Developer. All Rights Reserved.
 *
 *  Contributor(s):
 *  See @authors listed below
 *
 *  Alternatively, the contents of this file may be used under the terms of
 *  either the GNU General Public License Version 2 or later (the "GPL"), or
 *  the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 *  in which case the provisions of the GPL or the LGPL are applicable instead
 *  of those above. If you wish to allow use of your version of this file only
 *  under the terms of either the GPL or the LGPL, and not to allow others to
 *  use your version of this file under the terms of the MPL, indicate your
 *  decision by deleting the provisions above and replace them with the notice
 *  and other provisions required by the GPL or the LGPL. If you do not delete
 *  the provisions above, a recipient may use your version of this file under
 *  the terms of any one of the MPL, the GPL or the LGPL.
 *
 */

package org.dcm4chee.arc.dimse.rs;

import org.dcm4che3.conf.api.IApplicationEntityCache;
import org.dcm4che3.data.*;
import org.dcm4che3.json.JSONWriter;
import org.dcm4che3.net.*;
import org.dcm4che3.net.service.DicomServiceException;
import org.dcm4che3.net.service.QueryRetrieveLevel2;
import org.dcm4che3.util.SafeClose;
import org.dcm4che3.util.TagUtils;
import org.dcm4chee.arc.conf.ArchiveAEExtension;
import org.dcm4chee.arc.conf.ArchiveDeviceExtension;
import org.dcm4chee.arc.conf.AttributeSet;
import org.dcm4chee.arc.conf.Entity;
import org.dcm4chee.arc.diff.DiffContext;
import org.dcm4chee.arc.diff.DiffService;
import org.dcm4chee.arc.diff.DiffTask;
import org.dcm4chee.arc.query.util.QIDO;
import org.dcm4chee.arc.query.util.QueryAttributes;
import org.dcm4chee.arc.validation.constraints.ValidUriInfo;
import org.jboss.resteasy.annotations.cache.NoCache;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.enterprise.context.RequestScoped;
import javax.inject.Inject;
import javax.json.Json;
import javax.json.stream.JsonGenerator;
import javax.servlet.http.HttpServletRequest;
import javax.validation.constraints.Pattern;
import javax.ws.rs.*;
import javax.ws.rs.container.AsyncResponse;
import javax.ws.rs.container.CompletionCallback;
import javax.ws.rs.container.Suspended;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.StreamingOutput;
import javax.ws.rs.core.UriInfo;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Date;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

/**
 * @author Gunter Zeilinger <gunterze@gmail.com>
 * @since May 2017
 */
@RequestScoped
@Path("aets/{AETitle}/dimse/{ExternalAET}/diff/{OriginalAET}")
@ValidUriInfo(type = QueryAttributes.class)
public class DiffRS {

    private static final Logger LOG = LoggerFactory.getLogger(DiffRS.class);

    @Inject
    private DiffService diffService;

    @Context
    private HttpServletRequest request;

    @Context
    private UriInfo uriInfo;

    @Inject
    private Device device;

    @Inject
    private IApplicationEntityCache aeCache;

    @PathParam("AETitle")
    private String aet;

    @PathParam("ExternalAET")
    private String externalAET;

    @PathParam("OriginalAET")
    private String originalAET;

    @QueryParam("fuzzymatching")
    @Pattern(regexp = "true|false")
    private String fuzzymatching;

    @QueryParam("offset")
    @Pattern(regexp = "0|([1-9]\\d{0,4})")
    private String offset;

    @QueryParam("limit")
    @Pattern(regexp = "[1-9]\\d{0,4}")
    private String limit;

    @QueryParam("different")
    @Pattern(regexp = "true|false")
    private String different;

    @QueryParam("missing")
    @Pattern(regexp = "true|false")
    private String missing;

    @QueryParam("priority")
    @Pattern(regexp = "0|1|2")
    private String priority;

    @Override
    public String toString() {
        return request.getRequestURI() + '?' + request.getQueryString();
    }

    @GET
    @NoCache
    @Path("/studies")
    @Produces("application/dicom+json,application/json")
    public void searchForStudiesJSON(@Suspended AsyncResponse ar) throws Exception {
        try {
            DiffTask diffTask = initDiffTask(ar);
            int skip = offset();
            Attributes diff1;
            while ((diff1 = diffTask.nextDiff()) != null && skip-- > 0);
            if (diff1 == null)
                ar.resume(Response.noContent().build());
            else
                ar.resume(Response.ok(entity(diff1, diffTask)).build());
        } catch (IllegalArgumentException e) {
            throw new WebApplicationException(e.getMessage(),
                    Response.status(Response.Status.BAD_REQUEST).encoding(e.getMessage()).build());
        } catch (DicomServiceException e) {
            throw new WebApplicationException(errResponse(
                    errorMessage(e.getStatus(), e.getMessage()), Response.Status.BAD_GATEWAY));
        } catch (Exception e) {
            throw new WebApplicationException(errResponse(e.getMessage(), Response.Status.BAD_GATEWAY));
        }
    }

    @GET
    @NoCache
    @Path("/studies/count")
    @Produces("application/json")
    public void countDiffs(@Suspended AsyncResponse ar) {
        try {
            DiffTask diffTask = initDiffTask(ar);
            diffTask.countDiffs();
            ar.resume(Response.ok(
                    "{\"missing\":" + diffTask.missing() + ",\"different\":" + diffTask.different() + "}")
                    .build());
        } catch (IllegalArgumentException e) {
            throw new WebApplicationException(e.getMessage(),
                    Response.status(Response.Status.BAD_REQUEST).encoding(e.getMessage()).build());
        } catch (DicomServiceException e) {
            throw new WebApplicationException(errResponse(
                    errorMessage(e.getStatus(), e.getMessage()), Response.Status.BAD_GATEWAY));
        } catch (Exception e) {
            throw new WebApplicationException(errResponse(e.getMessage(), Response.Status.BAD_GATEWAY));
        }
    }

    private DiffTask initDiffTask(AsyncResponse ar) throws Exception {
        LOG.info("Process GET {} from {}@{}", request.getRequestURI(), request.getRemoteUser(), request.getRemoteHost());
        DiffContext ctx = new DiffContext()
                .setLocalAE(checkAE(aet, device.getApplicationEntity(aet, true)))
                .setExternalAE(checkAE(externalAET, aeCache.get(externalAET)))
                .setOriginalAE(checkAE(originalAET, aeCache.get(originalAET)))
                .setQueryString(request.getQueryString(), uriInfo.getQueryParameters());
        DiffTask diffTask = diffService.createDiffTask(ctx);
        ar.register((CompletionCallback) throwable -> {
            SafeClose.close(diffTask);
        });
        diffTask.init();
        return diffTask;
     }

    private static String errorMessage(int status, String errorComment) {
        String statusAsString = statusAsString(status);
        return errorComment == null ? statusAsString : statusAsString + " - " + errorComment;
    }

    private static String statusAsString(int status) {
        switch (status) {
            case Status.OutOfResources:
                return "A700: Refused: Out of Resources";
            case Status.IdentifierDoesNotMatchSOPClass:
                return "A900: Identifier does not match SOP Class";
        }
        return TagUtils.shortToHexString(status)
                + ((status & 0xF000) == Status.UnableToProcess
                ? ": Unable to Process"
                : ": Unexpected status code");
    }

    private static ApplicationEntity checkAE(String aet, ApplicationEntity ae) {
        if (ae == null || !ae.isInstalled())
            throw new WebApplicationException(errResponse(
                    "No such Application Entity: " + aet,
                    Response.Status.NOT_FOUND));
        return ae;
    }

    private static Response errResponse(String errorMessage, Response.Status status) {
        return Response.status(status).entity("{\"errorMessage\":\"" + errorMessage + "\"}").build();
    }

    private int offset() {
        return parseInt(offset, 0);
    }

    private int limit() {
        return parseInt(limit, Integer.MAX_VALUE);
    }

    private static int parseInt(String s, int defval) {
        return s != null ? Integer.parseInt(s) : defval;
    }

    private StreamingOutput entity(final Attributes diff1, final DiffTask diffTask) {
        return output -> {
            try (JsonGenerator gen = Json.createGenerator(output)) {
                JSONWriter writer = new JSONWriter(gen);
                gen.writeStartArray();
                int remaining = limit();
                Attributes diff = diff1;
                while (diff != null) {
                    writer.write(diff);
                    try {
                        diff = --remaining > 0 ? diffTask.nextDiff() : null;
                    } catch (Exception e) {
                        LOG.info("Failure on query for matching studies:\\n", e);
                        writer.write(new Attributes());
                        break;
                    }
                }
                gen.writeEnd();
            }
        };
    }


}
