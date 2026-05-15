import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerAuth } from './customer-auth';

describe('CustomerAuth', () => {
  let component: CustomerAuth;
  let fixture: ComponentFixture<CustomerAuth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerAuth],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerAuth);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
