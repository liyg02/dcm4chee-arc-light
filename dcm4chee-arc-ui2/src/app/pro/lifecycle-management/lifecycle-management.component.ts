import {Component, OnInit, ViewContainerRef} from '@angular/core';
import * as _ from 'lodash';
import {LifecycleManagementService} from "./lifecycle-management.service";
import {ConfirmComponent} from "../../widgets/dialogs/confirm/confirm.component";
import {MdDialogConfig, MdDialog, MdDialogRef} from "@angular/material";
import {DeviceConfiguratorService} from "../../device-configurator/device-configurator.service";
import {AppService} from "../../app.service";


@Component({
  selector: 'app-lifecycle-management',
  templateUrl: './lifecycle-management.component.html'
})
export class LifecycleManagementComponent implements OnInit {
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
    aet;
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
    schema = {
        "title": "Study Retention Policy",
        "description": "Study Retention Policy",
        "type": "object",
        "required": [
            "cn",
            "dcmRetentionPeriod",
            "dcmRulePriority",
            "dcmExpireSeriesIndividually"
        ],
        "properties": {
            "cn": {
                "title": "Name",
                "description": "Arbitrary/Meaningful name of the Study Retention Policy",
                "type": "string"
            },
            "dcmRetentionPeriod": {
                "title": "Study Retention Period",
                "description": "Study Retention Period in ISO-8601 period format PnYnMnD or PnW",
                "type": "string",
                "format": "dcmPeriod"
            },
            "dcmRulePriority": {
                "title": "Rule Priority",
                "description": "Rule Priority.",
                "type": "integer",
                "minimum": 0,
                "default": 0
            },
            "dcmProperty": {
                "title": "Property",
                "description": "Property in format <name>=<value>",
                "type": "array",
                "items": {
                    "type": "string"
                }
            },
            "dcmExpireSeriesIndividually": {
                "title": "Expire Series Individually",
                "description": "Indicates if series should be expired individually or not.",
                "type": "boolean",
                "default": false
            }
        }
    };
    formObj;
    model = {};
    table = [
        {
            title:"&nbsp;",
            code:"menu",
            widthWeight:0.6,
            calculatedWidth:"20%"
        },{
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
            widthWeight:0.2,
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
        },{
            title:"Expiration Date",
            code:"77771023",
            description:"Study Expiration Date",
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
    retentionPolicyTable = [
        {
            title:"Name",
            code:"cn",
            description:"Name of the Study Retention Policy",
            widthWeight:1,
            calculatedWidth:"20%"
        },
        {
            title:"Retention Period",
            code:"dcmRetentionPeriod",
            description:"Period of the Retention Policy",
            widthWeight:1,
            calculatedWidth:"20%"
        },
        {
            title:"Properties",
            code:"dcmProperty",
            description:"Properties of Retention Policy",
            widthWeight:3,
            calculatedWidth:"20%"
        }
    ];
    expiredStudies;
    allStudies;
    archiveDevice;
    StudyRetentionPolicy;
    dialogRef: MdDialogRef<any>;

    constructor(
        private service:LifecycleManagementService,
        public viewContainerRef: ViewContainerRef ,
        public dialog: MdDialog,
        public config: MdDialogConfig,
        public deviceConfigService:DeviceConfiguratorService,
        public mainservice:AppService
    ) { }

    ngOnInit() {
        this.getAets(2);
        this.calculateWidthOfTable('table');
        this.calculateWidthOfTable('retentionPolicyTable');
        // this.getArchiveDevice();
        this.getArchiveDevice(4);
        this.formObj = this.deviceConfigService.convertSchemaToForm({}, this.schema, {});
    };

    confirm(confirmparameters){
        this.config.viewContainerRef = this.viewContainerRef;
        this.dialogRef = this.dialog.open(ConfirmComponent, this.config);
        this.dialogRef.componentInstance.parameters = confirmparameters;
        return this.dialogRef.afterClosed();
    };
    search(){
        this.getStudies(false);
        this.getStudies(true);
    };
    dateToString(date){
        return (
            date.getFullYear() + '' +
            ((date.getMonth() < 9) ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)) + '' +
            ((date.getDate() < 10) ? '0' + date.getDate() : date.getDate())
        );
    }
/*    getArchiveDevice(){
        let $this = this;
        this.service.getArchiveDevice().subscribe(
            (archiveDevice)=>{
                console.log("archiveDevice",archiveDevice);
                $this.archiveDevice = archiveDevice;
            },
            (err)=>{
                console.error("err",err);
            }
        );
    }*/
    getArchiveDevice(retries){
        let $this = this;
        if(!this.mainservice.deviceName){
            if(retries){
                console.log("retry",retries);
                setTimeout(()=>{
                    $this.getArchiveDevice(retries-1);
                },400);
            }
        }else{
            this.service.getArchiveDevice(this.mainservice.deviceName).subscribe((res)=>{
                $this.archiveDevice = res;
                if(_.hasIn(res,"dcmArchiveDevice.dcmStudyRetentionPolicy")){
                    $this.StudyRetentionPolicy = _.get(res,"dcmArchiveDevice.dcmStudyRetentionPolicy");
                    console.log("$this.StudyRetentionPolicy ",$this.StudyRetentionPolicy );
                }
            },(err)=>{
                if(retries)
                    $this.getArchiveDevice(retries-1);
            });
        }
    }
    submitFunction(event){
        console.log("in submitFunction",event);
    }
    setExpiredDate(study){
        let $this = this;
        let expiredDate;
        if(_.hasIn(study,"77771023.Value.0") && study["77771023"].Value[0] != ""){
            console.log("va",study["77771023"].Value[0]);
            let expiredDateString = study["77771023"].Value[0];
            expiredDate = new Date(expiredDateString.substring(0, 4)+ '.' + expiredDateString.substring(4, 6) + '.' + expiredDateString.substring(6, 8));
        }else{
            expiredDate = new Date();
        }
        let parameters: any = {
            content: 'Set expired date',
            pCalendar: [{
                dateFormat:"dd.mm.yy",
                yearRange:"1800:2100",
                monthNavigator:true,
                yearNavigator:true,
                placeholder:"Expired date"
            }],
            result: {pCalendar:[expiredDate]},
            saveButton: 'SAVE'
        };
        this.confirm(parameters).subscribe(result => {
            if(result){
                console.log("result",result);
                console.log("result",(typeof result.pCalendar[0]));
                //TODO
                _.set(study,"77771023.Value[0]",$this.dateToString(result.pCalendar[0]));
                // study["77771023"].Value[0] = result.pCalendar[0];
            }
        });
    }

    getStudies(expired){
        let $this = this;
        if(this.aet){
            let queryParameters = this.createQueryParams(this.filters.limit + 1, this.createStudyFilterParams());
            this.service.getStudies(this.aet, queryParameters, expired).subscribe(
                (res)=>{
                    if(expired){
                        $this.expiredStudies = res;
                    }else{
                        $this.allStudies = res;
                    }
                },
                (err)=>{

                }
            );
        }else{
            alert("no aet"+this.aet);
        }
    }
    createStudyFilterParams() {
        let filter = Object.assign({}, this.filters);
        return filter;
    };

    calculateWidthOfTable(tableName){
        let summ = 0;
        _.forEach(this[tableName],(m,i)=>{
            summ += m.widthWeight;
        });
        _.forEach(this[tableName],(m,i)=>{
            m.calculatedWidth =  ((m.widthWeight * 100)/summ)+"%";
        });
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
    toggleBar(mode){
        if(this.toggle === mode){
            this.toggle = '';
        }else{
            this.toggle = mode;
        }
    }
    getAets(retries){
        let $this = this;
        this.service.getAets().subscribe(
            (aets)=>{
                $this.aets = aets;
                $this.aet = aets[0].title;
            },
            (err)=>{
                if (retries){
                    $this.getAets(retries - 1);
                }
            }
        );
    };
}
