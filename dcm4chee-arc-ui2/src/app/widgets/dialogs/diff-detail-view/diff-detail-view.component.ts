import {Component, OnInit, ViewContainerRef} from '@angular/core';
import {MdDialogRef, MdDialogConfig, MdDialog} from "@angular/material";
import * as _ from 'lodash';
import {DiffDetailViewService} from "./diff-detail-view.service";
import {AppService} from "../../../app.service";
import {ConfirmComponent} from "../confirm/confirm.component";
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
    currentStudyIndex = [];
    currentStudy = {
        "primary":{},
        "secondary":{}
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
        public config: MdDialogConfig
    ){}
    activeTable;
    setActiveTable(mode){
        this.activeTable = mode;
    }
    clearActiveTable(){
        this.activeTable = "";
    }
    buttonLabel = "SYNCHRONIZE THIS ENTRYS";
    titleLabel = "Compare Diff";
    ngOnInit() {
        let $this = this;
        this.prepareStudyWithIndex(this._index);
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
    executeProcess(){
        let $this = this;
        if(this._groupName === "missing"){
            let studyInstanceUID = this.getStudyInstanceUID(this.currentStudy.primary);
            if(studyInstanceUID && studyInstanceUID != ""){
                $this.confirm({
                    content: `Are you sure you want to send this study to ${this._copyScp2}?`
                }).subscribe(result => {
                    if (result) {
                        $this.service.exportStudyExternal(this._homeAet,this._cMoveScp1,studyInstanceUID,this._copyScp2).subscribe(
                            (res)=>{
                                console.log("res",res);
                                let msg = `Process successfully accomplished!<br> - Completed:${res.completed}<br> - Failed:${res.failed}<br> - Warnings:${res.warning}`;
                                $this.mainservice.setMessage({
                                    'title': 'Info',
                                    'text': msg,
                                    'status': 'info'
                                });
                                if($this._studies.length === 1){
                                    _.remove($this._studies, function(n,i){return i == $this._index});
                                    $this.dialogRef.close('last');
                                }else{
                                    _.remove($this._studies, function(n,i){return i == $this._index});
                                    $this.prepareStudyWithIndex($this._index);
                                }
                            },
                            (err)=>{
                                $this.mainservice.setMessage({
                                    'title': 'Error ' + err.status,
                                    'text': err.statusText,
                                    'status': 'error'
                                });
                            }
                        );
                    }
                });
            }else{
                alert("StudyInstanceUID is empty");
            }
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
                "secondary":{}
            };
            let diffIndexes = [];
            let noDiffIndexes = [];
            this.currentStudy["flat"] = {};
            this.currentStudy["level"] = {};
            this.flatMap(this._studies[this._index],"");
            if(this._groupName === "missing"){
                _.forEach(this.currentStudy["flat"],(m,i)=>{
                    if(i != "04000561"){
                        this.currentStudy["primary"][i] = {
                            object:m,
                            diff:false
                        }
                        diffIndexes.push(i)
                    }
                });
                this.currentStudyIndex = diffIndexes;
            }else{
                let modifyed = this._studies[this._index]["04000561"].Value[0]["04000550"].Value[0];
                _.forEach(this.currentStudy["flat"],(m,i)=>{
                    if(i != "04000561"){
                        if(_.hasIn(modifyed,i)){
                            this.currentStudy["secondary"][i] = {
                                object:modifyed[i],
                                diff:true
                            };
                            this.currentStudy["primary"][i] = {
                                object:m,
                                diff:true
                            };
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
                            noDiffIndexes.push(i);
                        }
                    }
                });
                this.currentStudyIndex = [...diffIndexes,...noDiffIndexes];
            }
            if(direction){
                this.addEffect(direction);
            }
        }
    }
    flatMap(object,level){
        _.forEach(object,(m,i)=>{
            if(m.vr === "SQ" && _.hasIn(m,"Value[0]")){
                if(i != "04000561"){
                    this.currentStudy["flat"][i] = {Value:[""]};
                    this.flatMap(m.Value[0],level+'>');
                }
            }else{
                this.currentStudy["flat"][i] = m;
            }
            this.currentStudy["level"][i] = level;
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
}
