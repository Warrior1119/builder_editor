import {getTestBed, TestBed} from '@angular/core/testing';
import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';

import {PosConnectService} from './pos-connect.service';

describe('PosConnectService', () => {
  let injector: TestBed;
  let terminalService: PosConnectService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PosConnectService],
    });
    injector = getTestBed();
    terminalService = TestBed.inject(PosConnectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  // GET VALUE

  it('integration() should return a integration', () => {
    const fixture = TestBed.createComponent(PosConnectService);
    const app = fixture.debugElement.componentInstance;
    fixture.detectChanges();
    expect(terminalService.integration).toEqual(app.value);
  });

  it('terminal() should return a terminal', () => {
    const fixture = TestBed.createComponent(PosConnectService);
    const app = fixture.debugElement.componentInstance;
    fixture.detectChanges();
    expect(terminalService.terminal).toEqual(app.value);
  });

  afterEach(() => {
    httpMock.verify();
  });
});
