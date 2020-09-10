import {TestBed} from '@angular/core/testing';
import {HttpErrorResponse} from '@angular/common/http';

import {MicroLoaderService} from './micro.service';

describe('MicroLoaderService', () => {
  let microLoaderService: MicroLoaderService;
  let microLoaderServiceSpy: jasmine.SpyObj<MicroLoaderService>;
  let httpClientSpy: { get: jasmine.Spy };


  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MicroLoaderService],
    });
    microLoaderService = TestBed.inject(MicroLoaderService);
    microLoaderServiceSpy = TestBed.inject(MicroLoaderService) as jasmine.SpyObj<MicroLoaderService>;
    httpClientSpy = jasmine.createSpyObj('HttpClient', ['get']);
  });

  it('should load builder', () => {
    expect(microLoaderService.loadBuild).toBeTruthy();
  });

  /*
  * COMPONENT TESTING BEFORE ERROR RESPONSE
  * */
  it('should catch error in _createBuildMicroConfigObservable()', () => {
    const errorResponse = new HttpErrorResponse({
      error: 'Cant load micro config',
    });
    httpClientSpy.get.and.returnValue(errorResponse);
  });

});
