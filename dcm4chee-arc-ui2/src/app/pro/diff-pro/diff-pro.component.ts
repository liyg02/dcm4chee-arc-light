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
    openDetailView(studies,i,groupName){
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
        this.dialogRef.componentInstance.index = i;
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
    getDiffAttributeSet(retries){
        let $this = this;
        this.service.getDiffAttributeSet().subscribe(
            (res)=>{
                $this.diffAttributes = res;
                $this.diffAttributes.push({
                    id:"missing",
                    title:"Missing studies",
                    descriptioin:"Compares only missing Studies"
                })
                $this.setLoadMore();
            },
            (err)=>{
                if (retries){
                    $this.getDiffAttributeSet(retries - 1);
                }
            }
        );
    };
    getAets(retries){
        let $this = this;
        this.service.getAets().subscribe(
            (aets)=>{
                $this.aets = aets;
                $this.homeAet = aets[0].title;
            },
            (err)=>{
                if (retries){
                    $this.getAets(retries - 1);
                }
            }
        );
    };
}
