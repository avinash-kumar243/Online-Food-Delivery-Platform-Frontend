import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryPartnerAuth } from './delivery-partner-auth';

describe('DeliveryPartnerAuth', () => {
  let component: DeliveryPartnerAuth;
  let fixture: ComponentFixture<DeliveryPartnerAuth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryPartnerAuth],
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryPartnerAuth);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
