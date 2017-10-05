import { Injectable } from '@angular/core';
import {Http, Headers} from "@angular/http";
import {Globalvar} from "../../../constants/globalvar";
import {WindowRefService} from "../../../helpers/window-ref.service";
import * as _ from 'lodash';

@Injectable()
export class DiffDetailViewService {
    jsonHeader = new Headers({ 'Content-Type': 'application/json' });
    constructor(
     private $http:Http
    ) { }

    rejectStudy(homeAet, externalAET, study, select){
        let $this = this;
        return this.$http.post(
            `../aets/${homeAet}/dimse/${externalAET}` + '/studies/' + study['0020000D'].Value[0] + '/reject/' + select,
            {},
            $this.jsonHeader
        )
            .map(res => {
                let resjson;
                try {
                    let pattern = new RegExp("[^:]*:\/\/[^\/]*\/auth\/");
                    if(pattern.exec(res.url)){
                        WindowRefService.nativeWindow.location = "/dcm4chee-arc/ui2/";
                    }
                    resjson = res.json();
                } catch (e) {
                    resjson = {};
                }
                return resjson;
            });
    }
    exportStudyExternal(aet,externalAET,StudyInstanceUID,destinationAET, queue?){
        let queueParam = "";
        if(queue){
            queueParam = "?queue=true";
        }
        return this.$http
            .post(
                Globalvar.EXPORT_STUDY_EXTERNAL_URL(aet,externalAET,StudyInstanceUID,destinationAET) + queueParam,
                {}
            )
            .map(res => {
                let resjson;
                try {
                    let pattern = new RegExp("[^:]*:\/\/[^\/]*\/auth\/");
                    if(pattern.exec(res.url)){
                        WindowRefService.nativeWindow.location = "/dcm4chee-arc/ui2/";
                    }
                    resjson = res.json();
                } catch (e) {
                    resjson = {};
                }
                return resjson;
            });
    }
    getStudyInstanceUID(object){
        if(_.hasIn(object,"0020000D.Value.0")){
            return _.get(object,"0020000D.Value.0");
        }else{
            if(_.hasIn(object,"0020000D.object.Value.0")){
                return _.get(object,"0020000D.object.Value.0");
            }else{
                return "";
            }
        }
    }
}
