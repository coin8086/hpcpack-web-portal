import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatTableDataSource } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections'
import { Node } from '../../models/node'
import { DefaultService as ApiService } from '../../api-client';
import { RestObject } from '../../api-client/model/models'
import { Looper } from '../../looper.service'

@Component({
  selector: 'app-node-list',
  templateUrl: './node-list.component.html',
  styleUrls: ['./node-list.component.scss']
})
export class NodeListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = ['select', 'name', 'state', 'health', 'groups'];

  dataSource: MatTableDataSource<Node> = new MatTableDataSource();

  selection = new SelectionModel<Node>(true);

  private interval = 2500;

  private looper: Looper<RestObject[]>;

  constructor(
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    this.looper = Looper.start(
      this.api.getNodes(),
      {
        next: (data) => {
          this.dataSource.data = data.map(e => Node.fromProperties(e.Properties));
          //TODO: select by id?
          let selected = new Set(this.selection.selected.map(e => e.Name));
          this.selection.clear();
          for (let node of this.dataSource.data) {
            if (selected.has(node.Name)) {
              this.selection.select(node);
            }
          }
        }
      },
      this.interval
    );
  }

  ngOnDestroy(): void {
    if (this.looper) {
      this.looper.stop();
    }
  }

  get anySelected(): boolean {
    return this.selection.selected.length > 0;
  }

  get allSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected == numRows;
  }

  get masterChecked(): boolean {
    return this.selection.hasValue() && this.allSelected;
  }

  get masterIndeterminate(): boolean {
    return this.selection.hasValue() && !this.allSelected;
  }

  masterToggle() {
    this.allSelected ?
      this.selection.clear() :
      this.dataSource.data.forEach(node => this.selection.select(node));
  }

  bringOnline(): void {
    let names = this.selection.selected.map(node => node.Name);
    this.api.operateNodes("online", names).subscribe();
  }

  takeOffline(): void {
    let names = this.selection.selected.map(node => node.Name);
    this.api.operateNodes("offline", names).subscribe();
  }
}