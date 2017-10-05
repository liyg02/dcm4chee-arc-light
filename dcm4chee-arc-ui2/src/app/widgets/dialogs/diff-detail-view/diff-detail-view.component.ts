import {Component, OnInit, ViewContainerRef} from '@angular/core';
import {MdDialogRef, MdDialogConfig, MdDialog} from "@angular/material";
import * as _ from 'lodash';
import {DiffDetailViewService} from "./diff-detail-view.service";
import {AppService} from "../../../app.service";
import {ConfirmComponent} from "../confirm/confirm.component";
import {HttpErrorHandler} from "../../../helpers/http-error-handler";
import {j4care} from "../../../helpers/j4care.service";
import {StudiesService} from "../../../studies/studies.service";
import {ExportDialogComponent} from "../export/export.component";
import {Headers, Http} from "@angular/http";
import {Observable} from "rxjs";
declare var DCM4CHE: any;

@Component({
  selector: 'app-diff-detail-view',
  templateUrl: './diff-detail-view.component.html'
})
export class DiffDetailViewComponent implements OnInit {

    private _studies;
    private _index;
    private _aet1;
    private _aet2;
    private _aes;
    private _copyScp1;
    private _cMoveScp1;
    private _copyScp2;
    private _cMoveScp2;
    private _homeAet;
    private _actions;
    private _patientMode;
    private _groupTitle;
    private _rjnotes;
    private _allAction;
    allActionLabel;
    showActions = false;
    currentStudyIndex = [];
    currentStudy = {
        "primary":{},
        "FIRST":{},
        "secondary":{},
        "SECOND":{}
    };
    Object = Object;
    _ = _;
    DCM4CHE = DCM4CHE;
    activeTr;
    private _groupName;
    selectedVersion = 'FIRST';
    selectedVersions = {
        "FIRST":"SECOND",
        "SECOND":"FIRST"
    }
    confDialogRef: MdDialogRef<any>;
    constructor(
        public dialogRef: MdDialogRef<DiffDetailViewComponent>,
        public service:DiffDetailViewService,
        public mainservice:AppService,
        public viewContainerRef: ViewContainerRef ,
        public dialog: MdDialog,
        public config: MdDialogConfig,
        public httpErrorHandler:HttpErrorHandler,
        public studyService:StudiesService,
        public $http:Http
    ){}
    activeTable;
    setActiveTable(mode){
        this.activeTable = mode;
    }
    clearActiveTable(){
        this.activeTable = "";
    }
    preparedStudies;
    buttonLabel = "SYNCHRONIZE THIS ENTRIES";
    titleLabel = "Compare Diff";
    selectLabel = "Select this version as the right one";
    ngOnInit() {
        let $this = this;
        this.titleLabel = "Compare " + j4care.firstLetterToLowerCase(this._groupTitle);
        setTimeout(function() {
            $('.first_table').on('scroll', function () {
                if($this.activeTable === 'FIRST'){
                    $('.edytatabel').scrollTop($('.first_table').scrollTop());
                }
            });
            $('.edytatabel').on('scroll', function () {
                if ($this.activeTable === 'SECOND') {
                    $('.first_table').scrollTop($('.edytatabel').scrollTop());
                }
            });
        },1000);
            this.prepareStudyWithIndex(this._index);
        if(this._actions.length > 1){
            this.selectLabel = "Select this one"
        }else{
            if(this._actions.length === 1 && !this.patientMode){
                this.selectLabel = "Select this one";
                this.buttonLabel = this._actions[0].label;
            }
        }
        if(this._allAction){
            if(this._allAction === "missing"){
                this.allActionLabel = `SEND ALL STUDIES`;
            }else{
                this.allActionLabel = `${j4care.firstLetterToUpperCase(this._allAction)} all entries`;
            }
            this.prepareAllStudies();
            this.selectLabel = "Select this AE as the right one";
        }
        if(this._groupName === "missing"){
            this.buttonLabel = "SEND STUDY TO SECONDARY AE";
            this.titleLabel = "Missing study in " + this._aet2;
        }
    }
    confirm(confirmparameters){
        this.config.viewContainerRef = this.viewContainerRef;
        this.confDialogRef = this.dialog.open(ConfirmComponent, this.config);
        this.confDialogRef.componentInstance.parameters = confirmparameters;
        return this.confDialogRef.afterClosed();
    };
    executeAllProcess(action){
        console.log("preparedstudies",this.preparedStudies);
        let toCallAction;
        let msg = `Are you sure you want to ${action} all entries?`;
        if(action === "missing"){
            msg = `Are you sure you want to send all studies to ${this._aet2}?`
        }
        // if(toCallAction){
            this.confirm({
                content: msg
            }).subscribe(ok => {
                if (ok) {
                    // _.forEach(this.preparedStudies,(m,i)=>{
                        try {
                            switch (action){
                                case "synchronize":
                                        if(this._patientMode){
                                            // toCallAction = "patient-update";
                                            // this.updatePatient(m[this.selectedVersion],i, false);
                                            this.updateAllPatients();
                                        }else{
                                            toCallAction = "study-reject-export";
                                        }
                                    break;
                                case "reject":
                                    toCallAction = "study-reject";
                                    break;
                                case "export":
                                    toCallAction = "study-export";
                                    break;
                                case "missing":
                                    toCallAction = "study-export";
                                    break;
                                default:
                                    this.mainservice.setMessage({
                                        'title': 'Error',
                                        'text': "Unknown action:" + action,
                                        'status': 'error'
                                    });
                            }
                            // this.prepareStudyWithIndex(parseInt(i));
                            // this.executeProcess(toCallAction);
                        }catch (e){
                            this.mainservice.setMessage({
                                'title': 'Error',
                                'text': "Process could not be started!",
                                'status': 'error'
                            });
                        }
/*                        if(this._studies.length === (i+1)){
                            console.log("before close studies",this._studies);
                            this.dialogRef.close('last');
                        }*/
                    // });
                }
            });
        // }else{
        //     this.mainservice.setMessage({
        //         'title': 'Error',
        //         'text': "Unknown action:" + action,
        //         'status': 'error'
        //     });
        // }
    }
    updateAllPatients(){
        this.preparedStudies
        let $this = this;
        this.studyService.getPatientIod().subscribe((patientIod) => {
            let internalAppName = this.studyService.getHl7ApplicationNameFormAETtitle(this._homeAet, this.aes);
            let externalAppName;
            if(this.selectedVersion === "FIRST"){
                externalAppName = this.studyService.getHl7ApplicationNameFormAETtitle(this.aet2, this.aes);
            }else{
                externalAppName = this.studyService.getHl7ApplicationNameFormAETtitle(this.aet1, this.aes);
            }
            let patientRxjs = [];
            _.forEach(this.preparedStudies,(patient,index)=>{
                patientRxjs.push($this.studyService.modifyPatient(
                    patient[this.selectedVersion],
                    patientIod,
                    $this.studyService.getPatientId(patient[this.selectedVersion]),
                    $this._homeAet,
                    internalAppName,
                    externalAppName,
                    "edit",
                    "external"
                ).save)
            });
            console.log("patientRxjs",patientRxjs);
            patientRxjs.push(this.$http.get("basdf"));
            patientRxjs.push(this.$http.get("basdf2"));
            let forkJoinResult;
            Observable.forkJoin(patientRxjs)
/*                .catch((error) =>{
                    console.log("in catch",error);
                    return error;
                })*/
                .subscribe((result)=>{
                console.log("process finished",result);
                while($this._studies.length > 0){
                    $this._studies.splice(0,1);
                }
                $this.mainservice.setMessage({
                    'title': 'Info',
                    'text': "Studies synchronize successfully",
                    'status': 'info'
                });
                console.log("forkJoinResult1",forkJoinResult);
                this.dialogRef.close('last');
            },(err)=>{
                console.log("forkJoinResult2",forkJoinResult);
                $this.httpErrorHandler.handleError(err);

            });
        },(err)=>{
            $this.httpErrorHandler.handleError(err);

        });
    }
    executeProcess(action){
        console.log("action",action);
        let $this = this;
        let title = 'Export study';
        let warning = 'Study will not be sent!';
        let externalAET;
        let destinationAET;
        if(this.selectedVersion === "FIRST"){
            externalAET = this._cMoveScp1;
            destinationAET = this._copyScp2;
        }else{
            externalAET = this._cMoveScp2;
            destinationAET = this._copyScp1;
        }
        switch(action) {
            case 'study-reject-export':
                this.rejectExportStudy(this.currentStudy[this.selectedVersion]);
                break;
            case 'study-reject':
                this.rejectStudy(this.currentStudy[this.selectedVersion], externalAET);
                break;
            case 'study-export':
                this.exportStudy(this.currentStudy[this.selectedVersion],externalAET,destinationAET);
                break;
            case 'patient-update':
                //code block
                this.updatePatient(this.currentStudy[this.selectedVersion],this._index, true);
                break;
            default:
                if(this.actions.length > 1 && !this.showActions){
                    this.showActions = true;
                }else{
                    this.showActions = false;
                    if(this._groupName === "missing"){
                        this.exportStudy(this.currentStudy.primary,this._cMoveScp1,this._copyScp2);
                    }else{
                        $this.mainservice.setMessage({
                            'title': 'Error',
                            'text': "Unknown action:" + action,
                            'status': 'error'
                        });
                    }
                }
        }
    }
    updatePatient(patient, index, showMessage){
        let $this = this;
        this.studyService.getPatientIod().subscribe((patientIod) => {
            let internalAppName = this.studyService.getHl7ApplicationNameFormAETtitle(this._homeAet, this.aes);
            let externalAppName;
            if(this.selectedVersion === "FIRST"){
                externalAppName = this.studyService.getHl7ApplicationNameFormAETtitle(this.aet2, this.aes);
            }else{
                externalAppName = this.studyService.getHl7ApplicationNameFormAETtitle(this.aet1, this.aes);
            }
            let modifyPatientService = $this.studyService.modifyPatient(
                patient,
                patientIod,
                $this.studyService.getPatientId(patient),
                $this._homeAet,
                internalAppName,
                externalAppName,
                "edit",
                "external"
            );
            if(modifyPatientService){
                modifyPatientService.save.subscribe((response)=>{
                    if(showMessage){
                        $this.mainservice.setMessage({
                            'title': 'Info',
                            'text': modifyPatientService.successMsg,
                            'status': 'info'
                        });
                    }
                    $this.removeElementFromObject(index);

                },(err)=>{
                    $this.httpErrorHandler.handleError(err);
                });
            }
        },(err)=>{
            $this.httpErrorHandler.handleError(err);
        });
    }
    allSuccess(patient){
        let allSuccess = true;
        _.forEach(patient,(m,i)=>{
            if(!(_.hasIn(m[this.selectedVersion],"success") && m[this.selectedVersion].success)){
               allSuccess = false;
            }
        });
        return allSuccess;
    }
    removeElementFromObject(index){
        if(this._studies.length === 1){
            _.remove(this._studies, function(n,i){return i == index});
            this.dialogRef.close('last');
        }else{
            _.remove(this._studies, function(n,i){return i == index});
            this.prepareStudyWithIndex(index);
        }
    }
    getExpiredRejectionType(){
        let rejectionCode;
        this._rjnotes.forEach((m,i)=>{
            if(m.type === "DATA_RETENTION_POLICY_EXPIRED"){
                rejectionCode = m.codeValue + '^' + m.codingSchemeDesignator;
            }
        });
        return rejectionCode;
    }
    rejectExportStudy(study){
        let $this = this;
        let rejectExternalAET;
        let destinationAET;
        let externalAET;
        if(this.selectedVersion === "FIRST"){
            externalAET = this._cMoveScp1;
            destinationAET = this._copyScp2;
            rejectExternalAET = this._copyScp2;
        }else{
            externalAET = this._cMoveScp2;
            destinationAET = this._copyScp1;
            rejectExternalAET = this._copyScp1;
        }
        let studyInstanceUID = this.service.getStudyInstanceUID(study);
        if(studyInstanceUID && studyInstanceUID != ""){
            $this.confirm({
                content: `Are you sure you want to reject the not selected study and export the selected one in to the not selected AEt?`
            }).subscribe(ok => {
                if (ok) {
                    let expiredCode = $this.getExpiredRejectionType();
                    if(expiredCode){
                        $this.service.rejectStudy(this._homeAet, rejectExternalAET, study, expiredCode)
                            .subscribe(
                                (successRejection) => {
                                    $this.mainservice.setMessage({
                                        'title': 'Info',
                                        'text': 'Study rejected successfully!',
                                        'status': 'info'
                                    });
                                    $this.service.exportStudyExternal(this._homeAet,externalAET,studyInstanceUID,destinationAET).subscribe(
                                        (successExport)=>{
                                            try{
                                                let msg = `Process successfully accomplished!<br> - Completed:${successExport.completed}<br> - Failed:${successExport.failed}<br> - Warnings:${successExport.warning}`;
                                                $this.mainservice.setMessage({
                                                    'title': 'Info',
                                                    'text': msg,
                                                    'status': 'info'
                                                });
                                            }catch (e){
                                                $this.mainservice.setMessage({
                                                    'title': 'Info',
                                                    'text': 'Study exported successfully!',
                                                    'status': 'info'
                                                });
                                            }
                                            $this.removeElementFromObject(this._index);
                                        },
                                        (err)=>{
                                            $this.httpErrorHandler.handleError(err);
                                        }
                                    );
                                },
                                (err) => {
                                    $this.httpErrorHandler.handleError(err);
                                }
                            );
                    }else{
                        $this.mainservice.setMessage({
                            'title': 'Error',
                            'text': 'Rejection code for expired retention policy not found!',
                            'status': 'error'
                        });
                    }
                }
            });
        }else{
            $this.mainservice.setMessage({
                'title': 'Error',
                'text': "StudyInstanceUID is empty",
                'status': 'error'
            });
        }
    }
    rejectStudy(study, externalAET){
        let $this = this;
        let select: any = [];
        _.forEach(this._rjnotes, (m, i) => {
            select.push({
                title: m.codeMeaning,
                value: m.codeValue + '^' + m.codingSchemeDesignator,
                label: m.label
            });
        });
        let parameters: any = {
            content: 'Select rejected type',
            select: select,
            result: {select: this._rjnotes[0].codeValue + '^' + this._rjnotes[0].codingSchemeDesignator},
            saveButton: 'REJECT'
        };
        this.confirm(parameters).subscribe(result => {
            if (result) {
                console.log('result', result);
                console.log('parameters', parameters);
                // $this.cfpLoadingBar.start();
                $this.service.rejectStudy(this._homeAet, externalAET, study, parameters.result.select)
                    .subscribe(
                    (response) => {
                        $this.mainservice.setMessage({
                            'title': 'Info',
                            'text': 'Study rejected successfully!',
                            'status': 'info'
                        });
                    },
                    (err) => {
                        $this.httpErrorHandler.handleError(err);
                        // angular.element("#querypatients").trigger('click');
                        // $this.cfpLoadingBar.complete();
                    }
                );
            } else {
                console.log('else', result);
                console.log('parameters', parameters);
            }
        });
    }
    exportStudy(study, externalAET, destinationAET){
        let $this = this;
        let studyInstanceUID = this.service.getStudyInstanceUID(study);
        if(studyInstanceUID && studyInstanceUID != ""){
            $this.confirm({
                content: `Are you sure you want to send this study to ${destinationAET}?`
            }).subscribe(result => {
                if (result) {
                    $this.service.exportStudyExternal(this._homeAet,externalAET,studyInstanceUID,destinationAET).subscribe(
                        (res)=>{
                            console.log("res",res);
                            let msg = `Process successfully accomplished!<br> - Completed:${res.completed}<br> - Failed:${res.failed}<br> - Warnings:${res.warning}`;
                            $this.mainservice.setMessage({
                                'title': 'Info',
                                'text': msg,
                                'status': 'info'
                            });
                            if($this._groupName === "missing"){
                                if($this._studies.length === 1){
                                    _.remove($this._studies, function(n,i){return i == $this._index});
                                    $this.dialogRef.close('last');
                                }else{
                                    _.remove($this._studies, function(n,i){return i == $this._index});
                                    $this.prepareStudyWithIndex($this._index);
                                }
                            }
                        },
                        (err)=>{
                            $this.httpErrorHandler.handleError(err);
                        }
                    );
                }
            });
        }else{
            $this.mainservice.setMessage({
                'title': 'Error',
                'text': "StudyInstanceUID is empty",
                'status': 'error'
            });
        }
    }
    addEffect(direction){
        let element = $('.diff_main_content');
        element.removeClass('fadeInRight').removeClass('fadeInLeft');
        setTimeout(function(){
            if (direction === 'left'){
                element.addClass('animated').addClass('fadeOutRight');
            }
            if (direction === 'right'){
                element.addClass('animated').addClass('fadeOutLeft');
            }
        }, 1);
        setTimeout(function(){
            element.removeClass('fadeOutRight').removeClass('fadeOutLeft');
            if (direction === 'left'){
                element.addClass('fadeInLeft').removeClass('animated');
            }
            if (direction === 'right'){
                element.addClass('fadeInRight').removeClass('animated');
            }
        }, 301);
    };

    privateCreator(tag) {
        if ('02468ACE'.indexOf(tag.charAt(3)) < 0) {
            let block = tag.slice(4, 6);
            if (block !== '00') {
                let el = this._studies[tag.slice(0, 4) + '00' + block];
                return el && el.Value && el.Value[0];
            }
        }
        return undefined;
    }
    changeSelectedVersion(version){
        if(this.selectedVersion === version){
            this.selectedVersion = this.selectedVersions[version];
        }else{
            this.selectedVersion = version;
        }
    }
    activateTr(primaryKey){
        this.activeTr = primaryKey;
    }
    clearTr(){
        this.activeTr = "";
    }
    prepareAllStudies(){
        this.preparedStudies = [];
        _.forEach(this._studies,(studie,index)=>{
            let diffIndexes = [];
            let noDiffIndexes = [];
            this.preparedStudies[index] = {
                "primary":{},
                "FIRST":{},
                "secondary":{},
                "SECOND":{},
                "flat":{},
                "level":{},
                "indexes":[],
                "success":false
            };
            this.flatMap(studie,"",this.preparedStudies[index], true);
            if(this._groupName === "missing"){
                _.forEach(this.preparedStudies[index]["flat"],(m,i)=>{
                    if(i != "04000561"){
                        this.preparedStudies[index]["primary"][i] = {
                            object:m,
                            diff:false
                        };
                        this.preparedStudies[index]["FIRST"][i] = m;
                        diffIndexes.push(i)
                    }
                });
                this.preparedStudies[index]["indexes"] = diffIndexes;
            }else{
                let modifyed = {
                    flat:{}
                };
                this.flatMap(studie["04000561"].Value[0]["04000550"].Value[0],"",modifyed, false);
                this.addEmptySequenceValues(modifyed.flat);

                //modifyed = this._studies[this._index]["04000561"].Value[0]["04000550"].Value[0];
                _.forEach(this.preparedStudies[index]["flat"],(m,i)=>{
                    if(i != "04000561"){
                        if(_.hasIn(modifyed.flat,i)){
                            this.preparedStudies[index]["secondary"][i] = {
                                object:modifyed.flat[i],
                                diff:true
                            };
                            this.preparedStudies[index]["primary"][i] = {
                                object:m,
                                diff:true
                            };
                            this.preparedStudies[index]["SECOND"][i] = modifyed.flat[i];
                            this.preparedStudies[index]["FIRST"][i] = m;
                            diffIndexes.push(i);
                        }else{
                            this.preparedStudies[index]["secondary"][i] ={
                                object:m,
                                diff:false
                            };
                            this.preparedStudies[index]["primary"][i] = {
                                object:m,
                                diff:false
                            };
                            this.preparedStudies[index]["SECOND"][i] = m;
                            this.preparedStudies[index]["FIRST"][i] = m;
                            noDiffIndexes.push(i);
                        }
                    }
                });
                this.preparedStudies[index]["indexes"] = [...diffIndexes,...noDiffIndexes];
            }
        });
/*        this.currentStudy = {
            "primary":{},
            "FIRST":{},
            "secondary":{},
            "SECOND":{}
        };
        this.currentStudy["flat"] = {};
        this.currentStudy["level"] = {};*/

    }
    prepareStudyWithIndex(index?:number){
        if(_.hasIn(this._studies,index)){
            let direction;
            if(this._index < index){
                direction = "right";
            }
            if(this._index > index){
                direction = "left";
            }
            this._index = index;
            this.currentStudy = {
                "primary":{},
                "FIRST":{},
                "secondary":{},
                "SECOND":{}
            };
            let diffIndexes = [];
            let noDiffIndexes = [];
            this.currentStudy["flat"] = {};
            this.currentStudy["level"] = {};
            this.flatMap(this._studies[this._index],"",this.currentStudy, true);
            if(this._groupName === "missing"){
                _.forEach(this.currentStudy["flat"],(m,i)=>{
                    if(i != "04000561"){
                        this.currentStudy["primary"][i] = {
                            object:m,
                            diff:false
                        };
                        this.currentStudy["FIRST"][i] = m;
                        diffIndexes.push(i)
                    }
                });
                this.currentStudyIndex = diffIndexes;
            }else{
                let modifyed = {
                    flat:{}
                };
                this.flatMap(this._studies[this._index]["04000561"].Value[0]["04000550"].Value[0],"",modifyed, false);
                this.addEmptySequenceValues(modifyed.flat);

                //modifyed = this._studies[this._index]["04000561"].Value[0]["04000550"].Value[0];
                _.forEach(this.currentStudy["flat"],(m,i)=>{
                    if(i != "04000561"){
                        if(_.hasIn(modifyed.flat,i)){
                            this.currentStudy["secondary"][i] = {
                                object:modifyed.flat[i],
                                diff:true
                            };
                            this.currentStudy["primary"][i] = {
                                object:m,
                                diff:true
                            };
                            this.currentStudy["SECOND"][i] = modifyed.flat[i];
                            this.currentStudy["FIRST"][i] = m;
                            diffIndexes.push(i);
                        }else{
                            this.currentStudy["secondary"][i] ={
                                object:m,
                                diff:false
                            };
                            this.currentStudy["primary"][i] = {
                                object:m,
                                diff:false
                            };
                            this.currentStudy["SECOND"][i] = m;
                            this.currentStudy["FIRST"][i] = m;
                            noDiffIndexes.push(i);
                        }
                    }
                });
                this.currentStudyIndex = [...diffIndexes,...noDiffIndexes];
            }
            if(direction){
                this.addEffect(direction);
            }
        }else{
            if(this._studies.length === 0){
                this.dialogRef.close('last');
            }else{
                console.error("Preparing study error, index doesen't exist in studies");
            }
        }
    }
    flatMap(object,level,endState, setLevel){
        _.forEach(object,(m,i)=>{
            if(m.vr === "SQ" && _.hasIn(m,"Value[0]")){
                if(i != "04000561"){
                    endState["flat"][i] = {Value:[""]};
                    this.flatMap(m.Value[0],level+'>', endState, setLevel);
                }
            }else{
                endState["flat"][i] = m;
            }
            if(setLevel){
                endState["level"][i] = level;
            }
        });
    }
    addEmptySequenceValues(object){
        _.forEach(object,(m,i)=>{
            if(m.vr === "SQ" && !_.hasIn(m,"Value[0]")){
                m["Value"] = [{}];
                _.forEach(this._studies[this._index][i].Value[0],(o,j)=>{
                    m["Value"][0][j] = {
                        Value:[""]
                    };
                });
            }
        });
    }
    get studies() {
        return this._studies;
    }

    set studies(value) {
        this._studies = value;
    }

    get index() {
        return this._index;
    }

    set index(value) {
        this._index = value;
    }

    get aet1() {
        return this._aet1;
    }

    set aet1(value) {
        this._aet1 = value;
    }

    get aet2() {
        return this._aet2;
    }

    set aet2(value) {
        this._aet2 = value;
    }

    get groupName() {
        return this._groupName;
    }

    set groupName(value) {
        this._groupName = value;
    }

    get aes() {
        return this._aes;
    }

    set aes(value) {
        this._aes = value;
    }

    get copyScp1() {
        return this._copyScp1;
    }

    set copyScp1(value) {
        this._copyScp1 = value;
    }

    get cMoveScp1() {
        return this._cMoveScp1;
    }

    set cMoveScp1(value) {
        this._cMoveScp1 = value;
    }

    get copyScp2() {
        return this._copyScp2;
    }

    set copyScp2(value) {
        this._copyScp2 = value;
    }

    get cMoveScp2() {
        return this._cMoveScp2;
    }

    set cMoveScp2(value) {
        this._cMoveScp2 = value;
    }

    get homeAet() {
        return this._homeAet;
    }

    set homeAet(value) {
        this._homeAet = value;
    }

    get actions() {
        return this._actions;
    }

    set actions(value) {
        this._actions = value;
    }

    get patientMode() {
        return this._patientMode;
    }

    set patientMode(value) {
        this._patientMode = value;
    }

    get groupTitle() {
        return this._groupTitle;
    }

    set groupTitle(value) {
        this._groupTitle = value;
    }

    get rjnotes() {
        return this._rjnotes;
    }

    set rjnotes(value) {
        this._rjnotes = value;
    }

    get allAction() {
        return this._allAction;
    }

    set allAction(value) {
        this._allAction = value;
    }
}
