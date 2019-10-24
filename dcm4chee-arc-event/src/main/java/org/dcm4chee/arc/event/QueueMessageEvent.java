package org.dcm4chee.arc.event;

import org.dcm4chee.arc.entity.QueueMessage;

import javax.servlet.http.HttpServletRequest;

/**
 * @author Vrinda Nayak <vrinda.nayak@j4care.com>
 * @since Jan 2018
 */

public class QueueMessageEvent {
    private final HttpServletRequest request;
    private final QueueMessageOperation operation;
    private QueueMessage queueMsg;
    private Exception exception;

    public QueueMessageEvent(HttpServletRequest request, QueueMessageOperation operation) {
        this.request = request;
        this.operation = operation;
    }

    public HttpServletRequest getRequest() {
        return request;
    }

    public QueueMessageOperation getOperation() {
        return operation;
    }

    public QueueMessage getQueueMsg() {
        return queueMsg;
    }

    public void setQueueMsg(QueueMessage queueMsg) {
        this.queueMsg = queueMsg;
    }

    public Exception getException() {
        return exception;
    }

    public void setException(Exception exception) {
        this.exception = exception;
    }
}
