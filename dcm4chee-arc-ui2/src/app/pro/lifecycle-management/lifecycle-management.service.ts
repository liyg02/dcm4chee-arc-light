import { Injectable } from '@angular/core';
import {AppService} from "../../app.service";
import {Http} from "@angular/http";
import {WindowRefService} from "../../helpers/window-ref.service";

@Injectable()
export class LifecycleManagementService {

    constructor(
        private $http:Http,
        private mainservice:AppService,
    ) { }
    _config(params) {
        return '?' + jQuery.param(params);
    };
    setExpiredDate(aet,studyUID, expiredDate){
        let url = `../aets/${aet}/rs/studies/${studyUID}/expire/${expiredDate}`
        return this.$http.put(url,{}).map(res => {
            let resjson;
            try{
                let pattern = new RegExp("[^:]*:\/\/[^\/]*\/auth\/");
                if(pattern.exec(res.url)){
                    WindowRefService.nativeWindow.location = "/dcm4chee-arc/ui2/";
                }
                resjson = res.json();
            }catch (e){
                resjson = {};
            }
            return resjson;
        });
    }

    saveArchivDevice(deviceObject){
        let url = `../devices/${deviceObject.dicomDeviceName}`;
        return this.$http.put(url, deviceObject).map(res => {
            let resjson;
            try{
                let pattern = new RegExp("[^:]*:\/\/[^\/]*\/auth\/");
                if(pattern.exec(res.url)){
                    WindowRefService.nativeWindow.location = "/dcm4chee-arc/ui2/";
                }
                resjson = res.json();
            }catch (e){
                resjson = {};
            }
            return resjson;
        });
    }
    getStudies(aet, params, expired){
        if(expired){
            params['expired'] = params['expired'] || true;
        }else{
            params['expired'] = params['expired'] || false;
            params['expired'] = false;
        }
        let url;
        url =  `../aets/${aet}/rs/studies${this._config(params)}`;
        return  this.$http.get(url).map(res => {
            let resjson;
            try{
                let pattern = new RegExp("[^:]*:\/\/[^\/]*\/auth\/");
                if(pattern.exec(res.url)){
                    WindowRefService.nativeWindow.location = "/dcm4chee-arc/ui2/";
                }
                resjson = res.json();
            }catch (e){
                resjson = {};
            }
            return resjson;
        });
    }
    getArchiveDevice(deviceName) {
        let $this = this;
        return this.$http.get(`../devices/${deviceName}`)
            .map(res => {
                let resjson;
                try {
                    let pattern = new RegExp("[^:]*:\/\/[^\/]*\/auth\/");
                    if (pattern.exec(res.url)) {
                        WindowRefService.nativeWindow.location = "/dcm4chee-arc/ui2/";
                    }
                    resjson = res.json();
                } catch (e) {
                    resjson = {};
                }
                return resjson;
            });
    }
    getAets(){
        return this.$http.get('../aets')
            .map(res => {
                let resjson;
                try{
                    let pattern = new RegExp("[^:]*:\/\/[^\/]*\/auth\/");
                    if(pattern.exec(res.url)){
                        WindowRefService.nativeWindow.location = "/dcm4chee-arc/ui2/";
                    }
                    resjson = res.json();
                }catch (e){
                    resjson = {};
                }
                return resjson;
            });
    };
}
