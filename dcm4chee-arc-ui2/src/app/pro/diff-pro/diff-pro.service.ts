import { Injectable } from '@angular/core';
import {Http} from "@angular/http";
import {WindowRefService} from "../../helpers/window-ref.service";
import {AppService} from "../../app.service";
import {Observable} from "rxjs";
import {SlimLoadingBarService} from "ng2-slim-loading-bar";

@Injectable()
export class DiffProService {

    constructor(
        private $http:Http,
        private mainservice:AppService,
        private cfpLoadingBar: SlimLoadingBarService,
    ) { }
    //Get own aets
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
    //Get All AEs
    getAes(){
       return this.$http.get('../aes')
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
    }
    _config(params) {
        return '?' + jQuery.param(params);
    };
    getDiffAttributeSet(){
        return this.$http.get('../attribute-set/DIFF_RS')
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
    }
    //Get diffs
    getBilateralDiffs(homeAet, aet1, aet2, params){
        let url1;
        let url2;
        if(!aet1){
            aet1 = homeAet;
        }
        if(!aet2){
            this.mainservice.setMessage({
                'title': 'Warning',
                'text': "Secondary AET is empty!",
                'status': 'warning'
            });
            this.cfpLoadingBar.complete();
            return;
        }else{
            url1 =  `../aets/${homeAet}/dimse/${aet1}/diff/${aet2}/studies${this._config(params)}`;
            url2 =  `../aets/${homeAet}/dimse/${aet2}/diff/${aet1}/studies${this._config(params)}`;
        }
        return Observable.combineLatest(
            this.$http.get(url1).map(res => {
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
            }),
            this.$http.get(url2).map(res => {
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
            })
        );
    }
    getDiff(homeAet, aet1, aet2, params){
        let url;
        url =  `../aets/${homeAet}/dimse/${aet1}/diff/${aet2}/studies${this._config(params)}`;
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

}
