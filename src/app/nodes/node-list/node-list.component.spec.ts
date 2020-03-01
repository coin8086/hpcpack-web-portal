import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations'

import { RouterLinkDirectiveStub } from 'src/test-stubs';
import { MaterialModule } from '../../material.module'
import { ApiService } from '../../services/api.service';
import { UserService } from '../../services/user.service'
import { NodeListComponent } from './node-list.component';
import { ActivatedRoute } from '@angular/router';
import { SharedComponents } from 'src/app/shared-components/shared-components.module';

describe('NodeListComponent', () => {
  let component: NodeListComponent;
  let fixture: ComponentFixture<NodeListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MaterialModule,
        SharedComponents,
      ],
      declarations: [
        RouterLinkDirectiveStub,
        NodeListComponent,
      ],
      providers: [
        { provide: ActivatedRoute, useValue: {} },
        { provide: UserService, useValue: { userOptions: { nodeOptions: {} } } },
        { provide: ApiService, useValue: {} },
      ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NodeListComponent);
    component = fixture.componentInstance;
    //TODO: uncomment the following line.
    //fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
