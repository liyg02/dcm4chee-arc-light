import {Component, OnInit, ViewEncapsulation, ViewContainerRef} from '@angular/core';
import {DiffProService} from "./diff-pro.service";
import {SlimLoadingBarService} from "ng2-slim-loading-bar";
import {AppService} from "../../app.service";
import {Globalvar} from "../../constants/globalvar";
import {DatePipe} from "@angular/common";
import * as _ from 'lodash';
import {DiffDetailViewComponent} from "../../widgets/dialogs/diff-detail-view/diff-detail-view.component";
import {MdDialogConfig, MdDialog, MdDialogRef} from "@angular/material";
import {DicomOperationsComponent} from "../../widgets/dialogs/dicom-operations/dicom-operations.component";
import {j4care} from "../../helpers/j4care.service";
import {WindowRefService} from "../../helpers/window-ref.service";
import {ConfirmComponent} from "../../widgets/dialogs/confirm/confirm.component";

@Component({
    selector: 'app-diff-pro',
    templateUrl: './diff-pro.component.html'
})
export class DiffProComponent implements OnInit {
    filters = {
        ExporterID: undefined,
        offset: undefined,
        limit: 3000,
        StudyUID: undefined,
        updatedBefore: undefined,
        dicomDeviceName: undefined,
        AccessionNumber:undefined,
        PatientName:undefined,
        fuzzymatching:undefined,
        PatientID:undefined,
        IssuerOfPatientID:undefined,
        StudyDescription:undefined,
        StudyInstanceUID:undefined,
        LocalNamespaceEntityID:undefined,
        'ScheduledProcedureStepSequence.ScheduledStationAETitle':undefined,
        ReferringPhysicianName:undefined,
        ModalitiesInStudy:undefined,
        StudyDate:undefined,
        StudyTime:undefined,
        SeriesDescription:undefined,
        StudyID:undefined,
        BodyPartExamined:undefined,
        SOPClassesInStudy:undefined,
        SendingApplicationEntityTitleOfSeries:undefined,
        InstitutionalDepartmentName:undefined,
        StationName:undefined,
        InstitutionName:undefined,
    };
    _ = _;
    aes;
    aets;
    aet1;
    aet2;
    homeAet;
    advancedConfig = false;
    diff;
    count;
    groupResults = {};
    disabled = {
        IssuerOfPatientID:false,
        LocalNamespaceEntityID:false
    };
    diffAttributes;
    modalities;
    showModalitySelector;
    StudyReceiveDateTime = {
        from: undefined,
        to: undefined
    };
    StudyDateTime = {
        from: undefined,
        to: undefined
    };
    groups;
    groupObject;
    Object = Object;
    toggle = '';
    table = [
        {
            title:"Patient's Name",
            code:"00100010",
            description:"Patient's Name",
            widthWeight:1,
            calculatedWidth:"20%"
        },{
            title:"Patient ID",
            code:"00100020",
            description:"Patient ID",
            widthWeight:1,
            calculatedWidth:"20%"
        },{
            title:"Birth Date",
            code:"00100030",
            description:"Patient's Birth Date",
            widthWeight:1,
            calculatedWidth:"20%"
        },{
            title:"Sex",
            code:"00100040",
            description:"Patient's Sex",
            widthWeight:1,
            calculatedWidth:"20%"
        },{
            title:"Issuer of PID",
            code:"00100021",
            description:"Issuer of Patient ID",
            widthWeight:1,
            calculatedWidth:"20%"
        },
        {
            title:"Study ID",
            code:"00200010",
            description:"Study ID",
            widthWeight:1,
            calculatedWidth:"20%"
        },{
            title:"Acc. Nr.",
            code:"00080050",
            description:"Accession Number",
            widthWeight:1,
            calculatedWidth:"20%"
        },
        {
            title:"Modality",
            code:"00080061",
            description:"Modalities in Study",
            widthWeight:0.6,
            calculatedWidth:"20%"
        },
        {
            title:"#S",
            code:"00201206",
            description:"Number of Study Related Series",
            widthWeight:0.2,
            calculatedWidth:"20%"
        },
        {
            title:"#I",
            code:"00201208",
            description:"Number of Study Related Instances",
            widthWeight:0.2,
            calculatedWidth:"20%"
        }
    ];
    copyScp1;
    cMoveScp1;
    copyScp2;
    cMoveScp2;
    moreGroupElements = {};
    moreFunctionsButtons = false;
    dialogRef: MdDialogRef<any>;
    rjnotes;
    constructor(
        private service:DiffProService,
        private cfpLoadingBar: SlimLoadingBarService,
        private mainservice:AppService,
        public viewContainerRef: ViewContainerRef ,
        public dialog: MdDialog,
        public config: MdDialogConfig
    ) { }

    ngOnInit() {
        this.getAes(2);
        this.getAets(2);
        this.getDiffAttributeSet(2);
        this.modalities = Globalvar.MODALITIES;
        this.calculateWidthOfTable();
        this.initRjNotes(2);
        this.groups = new Map();
        this.groups.set("patient",{
            label:"Patient data",
            count:43
        });
        this.groups.set("nopatient",{
            label:"Dicom data",
            count:35
        });
        this.groups.set("auftrag",{
            label:"Assignment data",
            count:251
        });
        this.groupObject = {
            "patient":{
                label:"Patient data",
                count:43
            },
            "nopatient":{
                label:"Dicom data",
                count:35
            },
            "auftrag":{
                label:"Assignment data",
                count:25
            }
        };
        $(".diff .float_content").on("scroll",".bluecontent",function () {
            console.log("scroll this",this);
        });

    };
    toggleBar(mode){
        if(this.groupResults[mode] && this.groupResults[mode].length > 0){
            if(this.toggle === mode){
                this.toggle = '';
                this.setLoadMore();
            }else{
                this.toggle = mode;
                this.setScrollEvent(mode,2);
            }
        }
    }
    setScrollEvent(id,retry){
        let $this = this;
        let selector = '.bluecontent.'+ id;
        setTimeout(()=>{
            if($(selector).length > 0){
                $(selector).scroll(function () {
                    $this.scrolling(id);
                });
            }else{
                if(retry){
                    console.log("in retry");
                    this.setScrollEvent(id,retry-1);
                }
            }
        },1000);
    }
    selectModality(key){
        this.filters.ModalitiesInStudy = key;
        this.filters['ScheduledProcedureStepSequence.Modality'] = key;
        $('.Modality').show();
        this.showModalitySelector = false;
    };

    setDicomOperationsFromPrimaryAndSecondaryAE(){
        this.copyScp1 = this.aet1 || this.homeAet;
        this.cMoveScp1 =  this.aet1 || this.homeAet;
        this.copyScp2 = this.aet2;
        this.cMoveScp2 =  this.aet2;
    }
    aetChanged(mode){
        console.log("in changed");
        this.setDicomOperationsFromPrimaryAndSecondaryAE();
    }
    setDicomOperations(){
        let $this = this;
        this.config.viewContainerRef = this.viewContainerRef;
        this.dialogRef = this.dialog.open(DicomOperationsComponent, {
            height: 'auto',
            width: '60%'
        });
        this.copyScp1 = this.copyScp1 || this.aet1;
        this.cMoveScp1 = this.cMoveScp1 ||  this.aet1;
        this.copyScp2 = this.copyScp2 || this.aet2;
        this.cMoveScp2 = this.cMoveScp2 ||  this.aet2;
        this.dialogRef.componentInstance.aes = this.aes;
        this.dialogRef.componentInstance.aet1 = this.aet1;
        this.dialogRef.componentInstance.aet2 = this.aet2;
        this.dialogRef.componentInstance.copyScp1 = this.copyScp1;
        this.dialogRef.componentInstance.cMoveScp1 = this.cMoveScp1;
        this.dialogRef.componentInstance.copyScp2 = this.copyScp2;
        this.dialogRef.componentInstance.cMoveScp2 = this.cMoveScp2;
        this.dialogRef.afterClosed().subscribe((result) => {
            if (result){
                $this.copyScp1 = (result.copyScp1)?result.copyScp1:$this.copyScp1;
                $this.cMoveScp1 = (result.cMoveScp1)?result.cMoveScp1:$this.cMoveScp1;
                $this.copyScp2 = (result.copyScp2)?result.copyScp2:$this.copyScp2;
                $this.cMoveScp2 = (result.cMoveScp2)?result.cMoveScp2:$this.cMoveScp2;
            }
        });
    }
    fireActionForAllElements(action,studies,i,attributes){
        console.log("action",action);
/*        let msg;
        switch (action){
            case "synchronize":
                msg = "Are you sure you want to synchronize all entries in this group?";
                break;
            case "reject":
                msg = "Are you sure you want to reject all studies in this group?";
                break;
            case "export":
                msg = "Are you sure you want to export all studies in this group?";
                break;
        }*/
/*        this.confirm({
            content: msg
        }).subscribe(ok => {
            if (ok) {*/
                this.openDetailView(studies,i,attributes,action);
/*            }
        });*/
    }
    openDetailView(studies,i,attributes,allAction?){

        let groupName = attributes.id;
        let $this = this;
        this.config.viewContainerRef = this.viewContainerRef;
        let width = "90%";
        if(groupName === "missing"){
            width = "60%"
        }
        this.dialogRef = this.dialog.open(DiffDetailViewComponent, {
            height: 'auto',
            width: width
        });
        this.copyScp1 = this.copyScp1 || this.aet1;
        this.cMoveScp1 = this.cMoveScp1 ||  this.aet1;
        this.copyScp2 = this.copyScp2 || this.aet2;
        this.cMoveScp2 = this.cMoveScp2 ||  this.aet2;
        this.dialogRef.componentInstance.aet1 = this.aet1;
        this.dialogRef.componentInstance.aet2 = this.aet2;
        this.dialogRef.componentInstance.aes = this.aes;
        this.dialogRef.componentInstance.homeAet = this.homeAet;
        this.dialogRef.componentInstance.copyScp1 = this.copyScp1;
        this.dialogRef.componentInstance.cMoveScp1 = this.cMoveScp1;
        this.dialogRef.componentInstance.copyScp2 = this.copyScp2;
        this.dialogRef.componentInstance.cMoveScp2 = this.cMoveScp2;
        this.dialogRef.componentInstance.studies = studies;
        this.dialogRef.componentInstance.groupName = groupName;
        this.dialogRef.componentInstance.groupTitle = attributes.title;
        this.dialogRef.componentInstance.index = i;
        this.dialogRef.componentInstance.allAction = allAction;
        this.dialogRef.componentInstance.rjnotes = this.rjnotes;
        this.dialogRef.componentInstance.patientMode = attributes.patientMode;
        this.dialogRef.componentInstance.actions = _.hasIn(attributes,"actions") ? attributes.actions : [];
        this.dialogRef.afterClosed().subscribe((result) => {
            if (result){
                if(result === "last"){
                    // $this.search();
                    $this.toggle = "";
                }
            }
        });
    };

    calculateWidthOfTable(){
        let summ = 0;
        _.forEach(this.table,(m,i)=>{
            summ += m.widthWeight;
        });
        _.forEach(this.table,(m,i)=>{
            m.calculatedWidth =  ((m.widthWeight * 100)/summ)+"%";
        });
    };

    clearForm(){
        _.forEach(this.filters, (m, i) => {
            if(i != "limit"){
                this.filters[i] = '';
            }
        });
        this.StudyReceiveDateTime = {
            from: undefined,
            to: undefined
        };
        this.StudyDateTime = {
            from: undefined,
            to: undefined
        };
    };

    studyReceiveDateTimeChanged(e, mode){
        this.filters['StudyReceiveDateTime'] = this.filters['StudyReceiveDateTime'] || {};
        this['StudyReceiveDateTime'][mode] = e;
        if (this.StudyReceiveDateTime.from && this.StudyReceiveDateTime.to){
            let datePipeEn = new DatePipe('us-US');
            this.filters['StudyReceiveDateTime'] = datePipeEn.transform(this.StudyReceiveDateTime.from, 'yyyyMMddHHmmss') + '-' + datePipeEn.transform(this.StudyReceiveDateTime.to, 'yyyyMMddHHmmss');
        }
    };

    studyDateTimeChanged(e, mode){
        this.filters['StudyDate'] = this.filters['StudyDate'] || {};
        this['StudyDateTime'][mode] = e;
        if (this.StudyDateTime.from && this.StudyDateTime.to){
            let datePipeEn = new DatePipe('us-US');
            let fromDate = datePipeEn.transform(this.StudyDateTime.from, 'yyyyMMdd');
            let toDate = datePipeEn.transform(this.StudyDateTime.to, 'yyyyMMdd');
            let fromTime = datePipeEn.transform(this.StudyDateTime.from, 'HHmmss');
            let toTime = datePipeEn.transform(this.StudyDateTime.to, 'HHmmss');
            if(fromDate === toDate){
                this.filters['StudyDate'] = fromDate;
            }else{
                this.filters['StudyDate'] = fromDate + '-' + toDate;
            }
/*            if(fromTime === toTime){
                this.filters['StudyTime'] = fromTime;
            }else{
                this.filters['StudyTime'] = fromTime + '-' + toTime;
            }*/
        }
    };

    conditionWarning($event, condition, msg){
        let id = $event.currentTarget.id;
        let $this = this;
        if (condition){
            this.disabled[id] = true;
            this.mainservice.setMessage({
                'title': 'Warning',
                'text': msg,
                'status': 'warning'
            });
            setTimeout(function() {
                $this.disabled[id] = false;
            }, 100);
        }
    };

    appendFilter(filter, key, range, regex) {
        let value = range.from.replace(regex, '');
        if (range.to !== range.from)
            value += '-' + range.to.replace(regex, '');
        if (value.length)
            filter[key] = value;
    };

    createStudyFilterParams() {
        let filter = Object.assign({}, this.filters);
        return filter;
    };

    createQueryParams(limit, filter) {
        let params = {
            includefield: 'all',
            limit: limit
        };
        for (let key in filter){
            if (filter[key] || filter === false){
                params[key] = filter[key];
            }
        }
        return params;
    };
    counts ={};
    showLoader = {};
    search(){
        let $this = this;
        this.cfpLoadingBar.start();
        if(!this.aet2) {
            this.mainservice.setMessage({
                'title': 'Warning',
                'text': "Secondary AET is empty!",
                'status': 'warning'
            });
            $this.cfpLoadingBar.complete();
        }else{
            if(!this.aet1){
                this.aet1 = this.homeAet;
            }
            _.forEach($this.diffAttributes,(m,i)=>{
                $this.counts[m.id] = null;
                $this.groupResults[m.id] = [];
                $this.showLoader[m.id] = true;
            });
            let queryParameters = this.createQueryParams(this.filters.limit + 1, this.createStudyFilterParams());
            _.forEach($this.diffAttributes,(m,i)=>{
                if(m.id === "missing"){
                    delete queryParameters["comparefield"];
                    queryParameters["different"] = false;
                    queryParameters["missing"] = true;
                    $this.cfpLoadingBar.start();

                    $this.service.getDiff($this.homeAet,$this.aet1,$this.aet2,queryParameters).subscribe(
                        (partDiff)=>{
                            $this.groupResults[m.id] = partDiff ? partDiff:[];
                            $this.counts[m.id] = partDiff ? partDiff.length : 0;
                            $this.showLoader[m.id] = false;
                            $this.toggle = '';
                            $this.cfpLoadingBar.complete();
                        },
                        (err)=>{
                            $this.cfpLoadingBar.complete();
                            $this.showLoader[m.id] = false;
                            $this.mainservice.setMessage({
                                'title': 'Error ' + err.status,
                                'text': 'Error getting ' + m.title + ' (' + err.statusText + ')',
                                'status': 'error'
                            });
                        });
                }else{
                    $this.cfpLoadingBar.start();
                    queryParameters["comparefield"] = m.id;
                    $this.service.getDiff($this.homeAet,$this.aet1,$this.aet2,queryParameters).subscribe(
                        (partDiff)=>{
                            $this.cfpLoadingBar.complete();
                            $this.counts[m.id] = partDiff ? partDiff.length : 0;
                            $this.toggle = '';
                            $this.groupResults[m.id] = partDiff ? partDiff:[];
                            $this.showLoader[m.id] = false;
                        },
                        (err)=>{
                            $this.cfpLoadingBar.complete();
                            $this.showLoader[m.id] = false;
                            $this.mainservice.setMessage({
                                'title': 'Error ' + err.status,
                                'text': 'Error getting ' + m.title + ' (' + err.statusText + ')',
                                'status': 'error'
                            });
                        });
                }
            });

        }
    };

    getAes(retries){
        let $this = this;
        this.service.getAes().subscribe(
            (aes)=>{
                $this.aes = _.sortBy(aes,['dicomAETitle']);
            },
            (err)=>{
                if (retries){
                    $this.getAes(retries - 1);
                }
            }
        );
    };
    setLoadMore(){
        let $this = this;
        _.forEach(this.diffAttributes,(m,i)=>{
            this.moreGroupElements[m.id] = {
                limit: 30,
                start: 0,
                loaderActive: false
            };
        });
    }
    loadMore(id){
        this.moreGroupElements[id].loaderActive = true;
        this.moreGroupElements[id].limit += 20;
        this.moreGroupElements[id].loaderActive = false;
    }

    scrolling(id){
        let hT = ($('.load_more.'+id).offset()) ? $('.load_more.'+id).offset().top : 0,
            hH = $('.load_more.'+id).outerHeight(),
            wH = $('.bluecontent.'+id).height(),
            wS = $('.bluecontent.'+id).scrollTop();
        if (wS > (hT + hH - wH)){
            this.loadMore(id);
        }
    }
    addLabelToActionArray(action){
        function replacerLabel(match, p1, p2, p3, offset, string) {
            if(p3){
                return 'SYNCHRONIZE THIS ENTRIES';
            }else{
                return j4care.firstLetterToUpperCase(p2) + ' selected ' + p1;
            }
        }
        function replacerDescription(match, p1, p2, p3, offset, string) {
            if(p3){
                return j4care.firstLetterToUpperCase(p2) + ' not selected ' + p1 + ' and ' + p3 + ' selected one to the not selected AEt';
            }else{
                return j4care.firstLetterToUpperCase(p2) + ' selected ' + p1;
            }
        }
        return action.map(m => {
            return {
                key: m,
                label: m.replace(/(\w*)\-(\w*)\-?(\w*)?/g, replacerLabel),
                description: m.replace(/(\w*)\-(\w*)\-?(\w*)?/g, replacerDescription)
            }
        });
    }
    convertActionToArray(str){
        const regex = /[A-Za-z0-9_-]*[^\s^,]/g;
        let m;
        let result = [];
        while ((m = regex.exec(str)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

/*            // The result can be accessed through the `m`-variable.
            m.forEach((match, groupIndex) => {
                console.log(`Found match, group ${groupIndex}: ${match}`);
            });*/
            result.push(m[0]);
        }
        return result;
    }
    confirm(confirmparameters){
        this.config.viewContainerRef = this.viewContainerRef;
        this.dialogRef = this.dialog.open(ConfirmComponent, {
            height: 'auto',
            width: 'auto'
        });
        this.dialogRef.componentInstance.parameters = confirmparameters;
        return this.dialogRef.afterClosed();
    };
    getDiffAttributeSet(retries){
        let $this = this;
        this.service.getDiffAttributeSet().subscribe(
            (res)=>{
                $this.diffAttributes = res;
                $this.diffAttributes.forEach((m,i)=>{
                    if(_.hasIn(m,"actions")){
                        m.patientMode = (m.actions.indexOf("patient-update") > -1) ? true : false;
                        m.actions = this.addLabelToActionArray(this.convertActionToArray(m.actions));
                    }else{
                        m.patientMode = false;
                    }
                    if(_.hasIn(m,"groupButtons")){
                        m.groupButtons = this.convertActionToArray(m.groupButtons).map((actionButton)=>{
                            switch (actionButton){
                                case "synchronize":
                                    return {
                                        action:actionButton,
                                        iconClass:"glyphicon glyphicon-transfer",
                                        title:"Synchronize all entries from this group"
                                    };
                                case "reject":
                                    return {
                                        action:actionButton,
                                        iconClass:"glyphicon glyphicon-trash",
                                        title:"Reject all entries from this group"
                                    };
                                case "export":
                                    return {
                                        action:actionButton,
                                        iconClass:"glyphicon glyphicon-export",
                                        title:"Export all entries from this group"
                                    };
                            }
                        });

                    }
                });
                //get first letter after "-": regex: /\-(\w)/g
                $this.diffAttributes.push({
                    id:"missing",
                    title:"Missing studies",
                    descriptioin:"Compares only missing Studies",
                    groupButtons:[{
                        action:"missing",
                        iconClass:"glyphicon glyphicon-export",
                        title:"Send all studies to secondary AE"
                    }]
                });
//Example
/*                _.forEach($this.diffAttributes,(m,i)=>{
                    $this.groupResults[m.id] = [{
 "00080005": {
 "vr": "CS",
 "Value": [
 "ISO_IR 100"
 ]
 },
 "00080020": {
 "vr": "DA",
 "Value": [
 "20170919"
 ]
 },
 "00080030": {
 "vr": "TM",
 "Value": [
 "121825"
 ]
 },
 "00080050": {
 "vr": "SH",
 "Value": [
 "35516947"
 ]
 },
 "00080052": {
 "vr": "CS",
 "Value": [
 "STUDY"
 ]
 },
 "00080054": {
 "vr": "AE",
 "Value": [
 "VNA"
 ]
 },
 "00080056": {
 "vr": "CS",
 "Value": [
 "ONLINE"
 ]
 },
 "00080061": {
 "vr": "CS",
 "Value": [
 "US"
 ]
 },
 "00080090": {
 "vr": "PN",
 "Value": [
 {
 "Alphabetic": "GYNA 8 Brustzentrum"
 }
 ]
 },
 "00081030": {
 "vr": "LO",
 "Value": [
 "Ultraschall"
 ]
 },
 "00081032": {
 "vr": "SQ",
 "Value": [
 {
 "00080100": {
 "vr": "SH",
 "Value": [
 "US-MAMMO"
 ]
 },
 "00080102": {
 "vr": "SH",
 "Value": [
 "99MAC"
 ]
 },
 "00080104": {
 "vr": "LO",
 "Value": [
 "Ultraschall"
 ]
 }
 }
 ]
 },
 "00081048": {
 "vr": "PN"
 },
 "00100010": {
 "vr": "PN",
 "Value": [
 {
 "Alphabetic": "TALEB, MAJEDA"
 }
 ]
 },
 "00100020": {
 "vr": "LO",
 "Value": [
 "4850957"
 ]
 },
 "00100021": {
 "vr": "LO"
 },
 "00100030": {
 "vr": "DA",
 "Value": [
 "19610126"
 ]
 },
 "00100032": {
 "vr": "TM"
 },
 "00100040": {
 "vr": "CS",
 "Value": [
 "F"
 ]
 },
 "00101001": {
 "vr": "PN"
 },
 "00101005": {
 "vr": "PN"
 },
 "00101010": {
 "vr": "AS",
 "Value": [
 "056Y"
 ]
 },
 "00101020": {
 "vr": "DS"
 },
 "00101030": {
 "vr": "DS"
 },
 "00101040": {
 "vr": "LO"
 },
 "00101060": {
 "vr": "PN"
 },
 "00101080": {
 "vr": "LO"
 },
 "00101081": {
 "vr": "LO"
 },
 "00101090": {
 "vr": "LO"
 },
 "00102000": {
 "vr": "LO"
 },
 "00102110": {
 "vr": "LO"
 },
 "00102150": {
 "vr": "LO"
 },
 "00102152": {
 "vr": "LO"
 },
 "00102154": {
 "vr": "SH"
 },
 "00102160": {
 "vr": "SH"
 },
 "00102180": {
 "vr": "SH"
 },
 "001021A0": {
 "vr": "CS"
 },
 "001021B0": {
 "vr": "LT"
 },
 "001021C0": {
 "vr": "US",
 "Value": [
 0
 ]
 },
 "001021D0": {
 "vr": "DA"
 },
 "001021F0": {
 "vr": "LO"
 },
 "00104000": {
 "vr": "LT",
 "Value": [
 "Insurance="
 ]
 },
 "0020000D": {
 "vr": "UI",
 "Value": [
 "1.2.276.0.24.438.35516947.4.0.1"
 ]
 },
 "00200010": {
 "vr": "SH",
 "Value": [
 "35516947"
 ]
 },
 "00201206": {
 "vr": "IS",
 "Value": [
 1
 ]
 },
 "00201208": {
 "vr": "IS",
 "Value": [
 17
 ]
 },
 "00380050": {
 "vr": "LO"
 },
 "00380500": {
 "vr": "LO"
 },
 "00403001": {
 "vr": "LO"
 },
 "04000561": {
 "vr": "SQ",
 "Value": [
 {
 "04000550": {
 "vr": "SQ",
 "Value": [
 {
 "00081032": {
 "vr": "SQ"
 },
 "00101010": {
 "vr": "AS"
 }
 }
 ]
 },
 "04000562": {
 "vr": "DT",
 "Value": [
 "20170919143643.683"
 ]
 },
 "04000563": {
 "vr": "LO",
 "Value": [
 "VNA4PLAZA"
 ]
 },
 "04000564": {
 "vr": "LO",
 "Value": [
 "SYNGO-PLAZA-01"
 ]
 },
 "04000565": {
 "vr": "CS",
 "Value": [
 "DIFFS"
 ]
 }
 }
 ]
 }
 },{"00080005":{"vr":"CS","Value":["ISO_IR 100"]},"00080020":{"vr":"DA","Value":["20170919"]},"00080030":{"vr":"TM","Value":["104659"]},"00080050":{"vr":"SH","Value":["35873801"]},"00080052":{"vr":"CS","Value":["STUDY"]},"00080054":{"vr":"AE","Value":["VNA"]},"00080056":{"vr":"CS","Value":["ONLINE"]},"00080061":{"vr":"CS","Value":["CR"]},"00080090":{"vr":"PN","Value":[{"Alphabetic":"Kinder-Klinik Ambulanz^KIKA1"}]},"00081030":{"vr":"LO","Value":["LWS"]},"00081032":{"vr":"SQ","Value":[{"00080100":{"vr":"SH","Value":["S-LWS-K"]},"00080102":{"vr":"SH","Value":["99MAC"]},"00080104":{"vr":"LO","Value":["LWS"]}}]},"00100010":{"vr":"PN","Value":[{"Alphabetic":"DA, SILVA VARELA JOAO CARLOS"}]},"00100020":{"vr":"LO","Value":["M188611"]},"00100021":{"vr":"LO"},"00100030":{"vr":"DA","Value":["20000314"]},"00100032":{"vr":"TM"},"00100040":{"vr":"CS","Value":["M"]},"00101001":{"vr":"PN"},"00101005":{"vr":"PN"},"00101010":{"vr":"AS","Value":["017Y"]},"00101020":{"vr":"DS"},"00101030":{"vr":"DS"},"00101040":{"vr":"LO"},"00101060":{"vr":"PN"},"00101080":{"vr":"LO"},"00101081":{"vr":"LO"},"00101090":{"vr":"LO"},"00102000":{"vr":"LO"},"00102110":{"vr":"LO"},"00102150":{"vr":"LO"},"00102152":{"vr":"LO"},"00102154":{"vr":"SH"},"00102160":{"vr":"SH"},"00102180":{"vr":"SH"},"001021A0":{"vr":"CS"},"001021B0":{"vr":"LT"},"001021C0":{"vr":"US","Value":[0]},"001021D0":{"vr":"DA"},"001021F0":{"vr":"LO"},"00104000":{"vr":"LT","Value":["Insurance="]},"0020000D":{"vr":"UI","Value":["1.2.276.0.24.438.35873801.4.0.1"]},"00200010":{"vr":"SH","Value":["35873801"]},"00201206":{"vr":"IS","Value":[2]},"00201208":{"vr":"IS","Value":[2]},"00380050":{"vr":"LO"},"00380500":{"vr":"LO"},"00403001":{"vr":"LO"},"04000561":{"vr":"SQ","Value":[{"04000550":{"vr":"SQ","Value":[{"00100010":{"vr":"PN","Value":[{"Alphabetic":"Da Silva Varela^Joao Carlos"}]}}]},"04000562":{"vr":"DT","Value":["20170919120900.795"]},"04000563":{"vr":"LO","Value":["VNA4PLAZA"]},"04000564":{"vr":"LO","Value":["SYNGO-PLAZA-01"]},"04000565":{"vr":"CS","Value":["DIFFS"]}}]}},{"00080005":{"vr":"CS","Value":["ISO_IR 100"]},"00080020":{"vr":"DA","Value":["20170919"]},"00080030":{"vr":"TM","Value":["105232"]},"00080050":{"vr":"SH","Value":["35873397"]},"00080052":{"vr":"CS","Value":["STUDY"]},"00080054":{"vr":"AE","Value":["VNA"]},"00080056":{"vr":"CS","Value":["ONLINE"]},"00080061":{"vr":"CS","Value":["CR"]},"00080090":{"vr":"PN","Value":[{"Alphabetic":"Chirurgie 1-Allg. Unfallch.^CH1A1"}]},"00081030":{"vr":"LO","Value":["Skelett untere Ext. bds"]},"00081032":{"vr":"SQ","Value":[{"00080100":{"vr":"SH","Value":["S-UNEXT-B"]},"00080102":{"vr":"SH","Value":["99MAC"]},"00080104":{"vr":"LO","Value":["Skelett untere Ext. bds"]}}]},"00100010":{"vr":"PN","Value":[{"Alphabetic":"Schroeder^Stefan"}]},"00100020":{"vr":"LO","Value":["6098917"]},"00100021":{"vr":"LO"},"00100030":{"vr":"DA","Value":["19951029"]},"00100040":{"vr":"CS","Value":["M"]},"00101010":{"vr":"AS","Value":["021Y"]},"00101020":{"vr":"DS","Value":[0.0]},"00101030":{"vr":"DS","Value":[0.0]},"00102000":{"vr":"LO"},"00102110":{"vr":"LO"},"00102160":{"vr":"SH"},"001021B0":{"vr":"LT"},"001021C0":{"vr":"US","Value":[4]},"00104000":{"vr":"LT"},"0020000D":{"vr":"UI","Value":["1.2.276.0.24.438.35873397.4.0.1"]},"00200010":{"vr":"SH","Value":["35873397"]},"00201206":{"vr":"IS","Value":[2]},"00201208":{"vr":"IS","Value":[2]},"04000561":{"vr":"SQ","Value":[{"04000550":{"vr":"SQ","Value":[{"00100010":{"vr":"PN","Value":[{"Alphabetic":"Schröder^Stefan"}]}}]},"04000562":{"vr":"DT","Value":["20170919120901.092"]},"04000563":{"vr":"LO","Value":["VNA4PLAZA"]},"04000564":{"vr":"LO","Value":["SYNGO-PLAZA-01"]},"04000565":{"vr":"CS","Value":["DIFFS"]}}]}},{"00080005":{"vr":"CS","Value":["ISO_IR 100"]},"00080020":{"vr":"DA","Value":["20170919"]},"00080030":{"vr":"TM","Value":["105016"]},"00080050":{"vr":"SH","Value":["35873363"]},"00080052":{"vr":"CS","Value":["STUDY"]},"00080054":{"vr":"AE","Value":["VNA"]},"00080056":{"vr":"CS","Value":["ONLINE"]},"00080061":{"vr":"CS","Value":["CR"]},"00080090":{"vr":"PN","Value":[{"Alphabetic":"Neurochirurgie Ambulanz^NCHA1"}]},"00081030":{"vr":"LO","Value":["HWS"]},"00081032":{"vr":"SQ","Value":[{"00080100":{"vr":"SH","Value":["S-W-HWS"]},"00080102":{"vr":"SH","Value":["99MAC"]},"00080104":{"vr":"LO","Value":["Skelett HWS"]}}]},"00100010":{"vr":"PN","Value":[{"Alphabetic":"Boese^Rainer"}]},"00100020":{"vr":"LO","Value":["4511080"]},"00100021":{"vr":"LO","Value":["UNKNOWN"]},"00100030":{"vr":"DA","Value":["19400225"]},"00100040":{"vr":"CS","Value":["M"]},"00101010":{"vr":"AS","Value":["077Y"]},"00101020":{"vr":"DS","Value":[0.0]},"00101030":{"vr":"DS","Value":[0.0]},"001021B0":{"vr":"LT"},"001021C0":{"vr":"US","Value":[4]},"0020000D":{"vr":"UI","Value":["1.2.276.0.24.438.35873363.4.0.1"]},"00200010":{"vr":"SH","Value":["35873363"]},"00201206":{"vr":"IS","Value":[2]},"00201208":{"vr":"IS","Value":[2]},"04000561":{"vr":"SQ","Value":[{"04000550":{"vr":"SQ","Value":[{"00100021":{"vr":"LO"}}]},"04000562":{"vr":"DT","Value":["20170919120901.210"]},"04000563":{"vr":"LO","Value":["VNA4PLAZA"]},"04000564":{"vr":"LO","Value":["SYNGO-PLAZA-01"]},"04000565":{"vr":"CS","Value":["DIFFS"]}}]}},{"00080005":{"vr":"CS","Value":["ISO_IR 100"]},"00080020":{"vr":"DA","Value":["20170919"]},"00080030":{"vr":"TM","Value":["100351"]},"00080050":{"vr":"SH","Value":["34875120"]},"00080052":{"vr":"CS","Value":["STUDY"]},"00080054":{"vr":"AE","Value":["VNA"]},"00080056":{"vr":"CS","Value":["ONLINE"]},"00080061":{"vr":"CS","Value":["MR","SR"]},"00080090":{"vr":"PN","Value":[{"Alphabetic":"Chirurgie 2-Organtransplant^VTXA2"}]},"00081030":{"vr":"LO","Value":["Abdomen^Leber"]},"00081032":{"vr":"SQ","Value":[{"00080100":{"vr":"SH","Value":["MR-BODYA"]},"00080102":{"vr":"SH","Value":["99MAC"]},"00080104":{"vr":"LO","Value":["MRT Leber mit MRCP"]}}]},"00100010":{"vr":"PN","Value":[{"Alphabetic":"Rössel^Volker"}]},"00100020":{"vr":"LO","Value":["4475214"]},"00100021":{"vr":"LO","Value":["UNKNOWN"]},"00100030":{"vr":"DA","Value":["19600915"]},"00100032":{"vr":"TM"},"00100040":{"vr":"CS","Value":["M"]},"00101001":{"vr":"PN"},"00101005":{"vr":"PN"},"00101010":{"vr":"AS","Value":["057Y"]},"00101020":{"vr":"DS","Value":[1.75]},"00101030":{"vr":"DS","Value":[77.0]},"00101040":{"vr":"LO"},"00101060":{"vr":"PN"},"00101080":{"vr":"LO"},"00101081":{"vr":"LO"},"00101090":{"vr":"LO"},"00102000":{"vr":"LO"},"00102110":{"vr":"LO"},"00102150":{"vr":"LO"},"00102152":{"vr":"LO"},"00102154":{"vr":"SH"},"00102160":{"vr":"SH"},"001021A0":{"vr":"CS"},"001021C0":{"vr":"US","Value":[0]},"001021D0":{"vr":"DA"},"001021F0":{"vr":"LO"},"00104000":{"vr":"LT","Value":["Insurance="]},"0020000D":{"vr":"UI","Value":["1.2.276.0.24.438.34875120.4.0.1"]},"00200010":{"vr":"SH","Value":["34875120"]},"00201206":{"vr":"IS","Value":[25]},"00201208":{"vr":"IS","Value":[1185]},"00380050":{"vr":"LO"},"00380500":{"vr":"LO"},"00403001":{"vr":"LO"},"04000561":{"vr":"SQ","Value":[{"04000550":{"vr":"SQ","Value":[{"00100021":{"vr":"LO"}}]},"04000562":{"vr":"DT","Value":["20170919120901.451"]},"04000563":{"vr":"LO","Value":["VNA4PLAZA"]},"04000564":{"vr":"LO","Value":["SYNGO-PLAZA-01"]},"04000565":{"vr":"CS","Value":["DIFFS"]}}]}},{"00080005":{"vr":"CS","Value":["ISO_IR 100"]},"00080020":{"vr":"DA","Value":["20170919"]},"00080030":{"vr":"TM","Value":["093617"]},"00080050":{"vr":"SH","Value":["34759548"]},"00080052":{"vr":"CS","Value":["STUDY"]},"00080054":{"vr":"AE","Value":["VNA"]},"00080056":{"vr":"CS","Value":["ONLINE"]},"00080061":{"vr":"CS","Value":["US"]},"00080090":{"vr":"PN","Value":[{"Alphabetic":"GYNA 8 Brustzentrum"}]},"00081030":{"vr":"LO","Value":["Ultraschall"]},"00081032":{"vr":"SQ","Value":[{"00080100":{"vr":"SH","Value":["US-MAMMO"]},"00080102":{"vr":"SH","Value":["99MAC"]},"00080104":{"vr":"LO","Value":["Ultraschall"]}}]},"00081048":{"vr":"PN"},"00100010":{"vr":"PN","Value":[{"Alphabetic":"KRELLIG, CINDY"}]},"00100020":{"vr":"LO","Value":["4084981"]},"00100030":{"vr":"DA","Value":["19771206"]},"00100040":{"vr":"CS","Value":["F"]},"00101010":{"vr":"AS","Value":["039Y"]},"00101020":{"vr":"DS"},"00101030":{"vr":"DS"},"00102180":{"vr":"SH"},"001021B0":{"vr":"LT"},"001021C0":{"vr":"US","Value":[0]},"00104000":{"vr":"LT","Value":["Insurance="]},"0020000D":{"vr":"UI","Value":["1.2.276.0.24.438.34759548.4.0.1"]},"00200010":{"vr":"SH","Value":["34759548"]},"00201206":{"vr":"IS","Value":[1]},"00201208":{"vr":"IS","Value":[14]},"04000561":{"vr":"SQ","Value":[{"04000550":{"vr":"SQ","Value":[{"00100010":{"vr":"PN","Value":[{"Alphabetic":"Krellig^Cindy"}]}}]},"04000562":{"vr":"DT","Value":["20170919120903.903"]},"04000563":{"vr":"LO","Value":["VNA4PLAZA"]},"04000564":{"vr":"LO","Value":["SYNGO-PLAZA-01"]},"04000565":{"vr":"CS","Value":["DIFFS"]}}]}},{"00080005":{"vr":"CS","Value":["ISO_IR 100"]},"00080020":{"vr":"DA","Value":["20170919"]},"00080030":{"vr":"TM","Value":["101408"]},"00080050":{"vr":"SH","Value":["35873421"]},"00080052":{"vr":"CS","Value":["STUDY"]},"00080054":{"vr":"AE","Value":["VNA"]},"00080056":{"vr":"CS","Value":["ONLINE"]},"00080061":{"vr":"CS","Value":["CT"]},"00080090":{"vr":"PN","Value":[{"Alphabetic":"F02-1"}]},"00081030":{"vr":"LO","Value":["CCT+Angio"]},"00100010":{"vr":"PN","Value":[{"Alphabetic":"STAUB, RENATE"}]},"00100020":{"vr":"LO","Value":["4374425"]},"00100030":{"vr":"DA","Value":["19381101"]},"00100040":{"vr":"CS","Value":["F"]},"00101010":{"vr":"AS","Value":["078Y"]},"001021C0":{"vr":"US","Value":[4]},"0020000D":{"vr":"UI","Value":["1.2.276.0.24.438.35873421.4.0.1"]},"00200010":{"vr":"SH","Value":["6613"]},"00201206":{"vr":"IS","Value":[16]},"00201208":{"vr":"IS","Value":[2338]},"04000561":{"vr":"SQ","Value":[{"04000550":{"vr":"SQ","Value":[{"00100010":{"vr":"PN","Value":[{"Alphabetic":"Staub^Renate"}]}}]},"04000562":{"vr":"DT","Value":["20170919120906.188"]},"04000563":{"vr":"LO","Value":["VNA4PLAZA"]},"04000564":{"vr":"LO","Value":["SYNGO-PLAZA-01"]},"04000565":{"vr":"CS","Value":["DIFFS"]}}]}},{"00080005":{"vr":"CS","Value":["ISO_IR 100"]},"00080020":{"vr":"DA","Value":["20170919"]},"00080030":{"vr":"TM","Value":["101239"]},"00080050":{"vr":"SH","Value":["35873017"]},"00080052":{"vr":"CS","Value":["STUDY"]},"00080054":{"vr":"AE","Value":["VNA"]},"00080056":{"vr":"CS","Value":["ONLINE"]},"00080061":{"vr":"CS","Value":["CR"]},"00080090":{"vr":"PN","Value":[{"Alphabetic":"Notaufnahme^ZNAA1"}]},"00081030":{"vr":"LO","Value":["Becken"]},"00081032":{"vr":"SQ","Value":[{"00080100":{"vr":"SH","Value":["S-BECKEN"]},"00080102":{"vr":"SH","Value":["99MAC"]},"00080104":{"vr":"LO","Value":["Skelett Becken"]}}]},"00100010":{"vr":"PN","Value":[{"Alphabetic":"BAUER, KATRIN"}]},"00100020":{"vr":"LO","Value":["4156745"]},"00100030":{"vr":"DA","Value":["19650707"]},"00100040":{"vr":"CS","Value":["F"]},"00101010":{"vr":"AS","Value":["052Y"]},"00101020":{"vr":"DS","Value":[0.0]},"00101030":{"vr":"DS","Value":[0.0]},"00102000":{"vr":"LO"},"00102110":{"vr":"LO"},"00102160":{"vr":"SH"},"001021B0":{"vr":"LT"},"001021C0":{"vr":"US","Value":[4]},"00104000":{"vr":"LT"},"0020000D":{"vr":"UI","Value":["1.2.276.0.24.438.35873017.4.0.1"]},"00200010":{"vr":"SH","Value":["35873017"]},"00201206":{"vr":"IS","Value":[1]},"00201208":{"vr":"IS","Value":[1]},"00380050":{"vr":"LO"},"00403001":{"vr":"LO"},"04000561":{"vr":"SQ","Value":[{"04000550":{"vr":"SQ","Value":[{"00100010":{"vr":"PN","Value":[{"Alphabetic":"Bauer^Katrin"}]}}]},"04000562":{"vr":"DT","Value":["20170919120907.571"]},"04000563":{"vr":"LO","Value":["VNA4PLAZA"]},"04000564":{"vr":"LO","Value":["SYNGO-PLAZA-01"]},"04000565":{"vr":"CS","Value":["DIFFS"]}}]}},{"00080005":{"vr":"CS","Value":["ISO_IR 100"]},"00080020":{"vr":"DA","Value":["20170919"]},"00080030":{"vr":"TM","Value":["101510"]},"00080050":{"vr":"SH","Value":["35872969"]},"00080052":{"vr":"CS","Value":["STUDY"]},"00080054":{"vr":"AE","Value":["VNA"]},"00080056":{"vr":"CS","Value":["ONLINE"]},"00080061":{"vr":"CS","Value":["CR"]},"00080090":{"vr":"PN","Value":[{"Alphabetic":"Notaufnahme^ZNAA1"}]},"00081030":{"vr":"LO","Value":["BWS"]},"00081032":{"vr":"SQ","Value":[{"00080100":{"vr":"SH","Value":["S-W-BWS"]},"00080102":{"vr":"SH","Value":["99MAC"]},"00080104":{"vr":"LO","Value":["Skelett BWS"]}}]},"00100010":{"vr":"PN","Value":[{"Alphabetic":"BAUER, KATRIN"}]},"00100020":{"vr":"LO","Value":["4156745"]},"00100030":{"vr":"DA","Value":["19650707"]},"00100040":{"vr":"CS","Value":["F"]},"00101010":{"vr":"AS","Value":["052Y"]},"00101020":{"vr":"DS","Value":[0.0]},"00101030":{"vr":"DS","Value":[0.0]},"00102000":{"vr":"LO"},"00102110":{"vr":"LO"},"00102160":{"vr":"SH"},"001021B0":{"vr":"LT"},"001021C0":{"vr":"US","Value":[4]},"00104000":{"vr":"LT"},"0020000D":{"vr":"UI","Value":["1.2.276.0.24.438.35872969.4.0.1"]},"00200010":{"vr":"SH","Value":["35872969"]},"00201206":{"vr":"IS","Value":[2]},"00201208":{"vr":"IS","Value":[2]},"00380050":{"vr":"LO"},"00403001":{"vr":"LO"},"04000561":{"vr":"SQ","Value":[{"04000550":{"vr":"SQ","Value":[{"00100010":{"vr":"PN","Value":[{"Alphabetic":"Bauer^Katrin"}]}}]},"04000562":{"vr":"DT","Value":["20170919120907.822"]},"04000563":{"vr":"LO","Value":["VNA4PLAZA"]},"04000564":{"vr":"LO","Value":["SYNGO-PLAZA-01"]},"04000565":{"vr":"CS","Value":["DIFFS"]}}]}},{"00080005":{"vr":"CS","Value":["ISO_IR 100"]},"00080020":{"vr":"DA","Value":["20170919"]},"00080030":{"vr":"TM","Value":["101615"]},"00080050":{"vr":"SH","Value":["35872985"]},"00080052":{"vr":"CS","Value":["STUDY"]},"00080054":{"vr":"AE","Value":["VNA"]},"00080056":{"vr":"CS","Value":["ONLINE"]},"00080061":{"vr":"CS","Value":["CR"]},"00080090":{"vr":"PN","Value":[{"Alphabetic":"Notaufnahme^ZNAA1"}]},"00081030":{"vr":"LO","Value":["HWS"]},"00081032":{"vr":"SQ","Value":[{"00080100":{"vr":"SH","Value":["S-W-HWS"]},"00080102":{"vr":"SH","Value":["99MAC"]},"00080104":{"vr":"LO","Value":["Skelett HWS"]}}]},"00100010":{"vr":"PN","Value":[{"Alphabetic":"BAUER, KATRIN"}]},"00100020":{"vr":"LO","Value":["4156745"]},"00100030":{"vr":"DA","Value":["19650707"]},"00100040":{"vr":"CS","Value":["F"]},"00101010":{"vr":"AS","Value":["052Y"]},"00101020":{"vr":"DS","Value":[0.0]},"00101030":{"vr":"DS","Value":[0.0]},"00102000":{"vr":"LO"},"00102110":{"vr":"LO"},"00102160":{"vr":"SH"},"001021B0":{"vr":"LT"},"001021C0":{"vr":"US","Value":[4]},"00104000":{"vr":"LT"},"0020000D":{"vr":"UI","Value":["1.2.276.0.24.438.35872985.4.0.1"]},"00200010":{"vr":"SH","Value":["35872985"]},"00201206":{"vr":"IS","Value":[3]},"00201208":{"vr":"IS","Value":[3]},"00380050":{"vr":"LO"},"00403001":{"vr":"LO"},"04000561":{"vr":"SQ","Value":[{"04000550":{"vr":"SQ","Value":[{"00100010":{"vr":"PN","Value":[{"Alphabetic":"Bauer^Katrin"}]}}]},"04000562":{"vr":"DT","Value":["20170919120908.031"]},"04000563":{"vr":"LO","Value":["VNA4PLAZA"]},"04000564":{"vr":"LO","Value":["SYNGO-PLAZA-01"]},"04000565":{"vr":"CS","Value":["DIFFS"]}}]}},{"00080005":{"vr":"CS","Value":["ISO_IR 100"]},"00080020":{"vr":"DA","Value":["20170919"]},"00080030":{"vr":"TM","Value":["101357"]},"00080050":{"vr":"SH","Value":["35872977"]},"00080052":{"vr":"CS","Value":["STUDY"]},"00080054":{"vr":"AE","Value":["VNA"]},"00080056":{"vr":"CS","Value":["ONLINE"]},"00080061":{"vr":"CS","Value":["CR"]},"00080090":{"vr":"PN","Value":[{"Alphabetic":"Notaufnahme^ZNAA1"}]},"00081030":{"vr":"LO","Value":["LWS"]},"00081032":{"vr":"SQ","Value":[{"00080100":{"vr":"SH","Value":["S-W-LWS"]},"00080102":{"vr":"SH","Value":["99MAC"]},"00080104":{"vr":"LO","Value":["Skelett LWS"]}}]},"00100010":{"vr":"PN","Value":[{"Alphabetic":"BAUER, KATRIN"}]},"00100020":{"vr":"LO","Value":["4156745"]},"00100030":{"vr":"DA","Value":["19650707"]},"00100040":{"vr":"CS","Value":["F"]},"00101010":{"vr":"AS","Value":["052Y"]},"00101020":{"vr":"DS","Value":[0.0]},"00101030":{"vr":"DS","Value":[0.0]},"00102000":{"vr":"LO"},"00102110":{"vr":"LO"},"00102160":{"vr":"SH"},"001021B0":{"vr":"LT"},"001021C0":{"vr":"US","Value":[4]},"00104000":{"vr":"LT"},"0020000D":{"vr":"UI","Value":["1.2.276.0.24.438.35872977.4.0.1"]},"00200010":{"vr":"SH","Value":["35872977"]},"00201206":{"vr":"IS","Value":[3]},"00201208":{"vr":"IS","Value":[3]},"00380050":{"vr":"LO"},"00403001":{"vr":"LO"},"04000561":{"vr":"SQ","Value":[{"04000550":{"vr":"SQ","Value":[{"00100010":{"vr":"PN","Value":[{"Alphabetic":"Bauer^Katrin"}]}}]},"04000562":{"vr":"DT","Value":["20170919120908.357"]},"04000563":{"vr":"LO","Value":["VNA4PLAZA"]},"04000564":{"vr":"LO","Value":["SYNGO-PLAZA-01"]},"04000565":{"vr":"CS","Value":["DIFFS"]}}]}}];
                    $this.counts[m.id] = 4;
                    $this.toggle = '';
                    $this.showLoader[m.id] = false;
                });*/
                $this.setLoadMore();
            },
            (err)=>{
                if (retries){
                    $this.getDiffAttributeSet(retries - 1);
                }
            }
        );
    };
    initRjNotes(retries) {
        let $this = this;
        this.service.rjNotes().subscribe(
                (res) => {
                    let rjnotes = res;
                    rjnotes.sort(function (a, b) {
                        if (a.codeValue === '113039' && a.codingSchemeDesignator === 'DCM')
                            return -1;
                        if (b.codeValue === '113039' && b.codingSchemeDesignator === 'DCM')
                            return 1;
                        return 0;
                    });
                    $this.rjnotes = rjnotes;
                    // $this.reject = rjnotes[0].codeValue + '^' + rjnotes[0].codingSchemeDesignator;

                    // $this.mainservice.setGlobal({rjnotes:rjnotes,reject:$this.reject});
                },
                (res) => {
                    if (retries)
                        $this.initRjNotes(retries - 1);
                });
    }
    getAets(retries){
        let $this = this;
        this.service.getAets().subscribe(
            (aets)=>{
                $this.aets = aets;
                $this.homeAet = aets[0].dicomAETitle;
            },
            (err)=>{
                if (retries){
                    $this.getAets(retries - 1);
                }
            }
        );
    };
}
