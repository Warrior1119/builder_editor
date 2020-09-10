import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from "@angular/core/testing";

import { NO_ERRORS_SCHEMA } from "@angular/core";
import { QRIntegrationComponent } from "./qr-settings.component";
import { of } from "rxjs";
import { mockTerminal, mockIntegrationInfo } from "../../../../../test-mocks";
import { Router, RouterModule, ActivatedRoute } from "@angular/router";
import {
  ApiService,
  BackRoutingService,
  HeaderService,
  EnvService,
} from "../../../../../app/core";
import { I18nModule } from "@pe/ng-kit/src/kit/i18n";
import { FormBuilder, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { SessionStorageService } from "ngx-webstorage";
import { PlatformService } from "@pe/ng-kit/src/kit/common";
import { QRService } from "@pe/ng-kit/src/kit/qr";

describe("QRIntegrationComponent", () => {
  let component: QRIntegrationComponent;
  let fixture: ComponentFixture<QRIntegrationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterModule,
        I18nModule.forRoot(),
        FormsModule,
        ReactiveFormsModule,
      ],
      declarations: [QRIntegrationComponent],
      providers: [
        {
          provide: ApiService,
          useValue: {
            getIntegrationsInfo: () => of([mockIntegrationInfo]),
            getBusinessData: () => of({name: 'Some business'})
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: () => {},
          },
        },
        {
          provide: PlatformService,
          useValue: {
            backToDashboard: () => {},
          },
        },
        {
          provide: BackRoutingService,
          useValue: {
            back: () => {},
          },
        },
        {
          provide: HeaderService,
          useValue: {
            setShortHeader: () => {},
            setHeader: () => {},
          },
        },
        {
          provide: QRService,
          useValue: {
            writeToCanvas: () => of(""),
            generateDataURLImg: () => of(""),
          },
        },
        {
          provide: EnvService,
          useValue: {},
        },
        {
          provide: SessionStorageService,
          useValue: {},
        },
        FormBuilder,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(QRIntegrationComponent);
    component = fixture.componentInstance;
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should init without errors", fakeAsync(() => {
    component.ngOnInit();
    tick(100);
    expect(component).toBeTruthy();
  }));

  it("should call getIntegrationsInfo and setShortHeader init without errors", fakeAsync(() => {
    const setShortHeaderSpy = spyOn(
      TestBed.get(HeaderService),
      "setShortHeader"
    );
    const getIntegrationsInfoSpy = spyOn(
      TestBed.get(ApiService),
      "getIntegrationsInfo"
    );
    getIntegrationsInfoSpy.and.returnValue(of([mockIntegrationInfo]));

    component.ngOnInit();
    tick(100);

    expect(getIntegrationsInfoSpy).toHaveBeenCalledTimes(1);
    expect(setShortHeaderSpy).toHaveBeenCalledTimes(1);
  }));

  it("should handleClose without errors", () => {
    const navigateSpy = spyOn(TestBed.get(Router), "navigate");
    component.handleClose();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it("should goToConnectClick without errors", () => {
    const navigateSpy = spyOn(TestBed.get(Router), "navigate");

    component.integration = mockIntegrationInfo;
    component.goToConnectClick();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
  });

  it("should printQRClick without errors", fakeAsync(() => {
    const writeToCanvasSpy = spyOn(TestBed.get(QRService), "writeToCanvas");
    writeToCanvasSpy.and.returnValue(of(""));

    component.integration = mockIntegrationInfo;
    component.printQRClick();
    tick(100);

    expect(component.showQR).toBeTruthy();
    expect(writeToCanvasSpy).toHaveBeenCalledTimes(1);
  }));

  it("should downloadQRClick without errors", fakeAsync(() => {
    const generateDataURLImgSpy = spyOn(
      TestBed.get(QRService),
      "generateDataURLImg"
    );
    generateDataURLImgSpy.and.returnValue(of(""));

    component.integration = mockIntegrationInfo;
    component.downloadQRClick();
    tick(100);

    expect(generateDataURLImgSpy).toHaveBeenCalledTimes(1);
  }));
});
