import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatTableDataSource, MatDialog, PageEvent } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections'
import { MatSort, Sort } from '@angular/material/sort';
import { MatSidenavContainer } from '@angular/material/sidenav'
import { Subscription } from 'rxjs'
import { mergeMap } from 'rxjs/operators';
import { Node } from '../../models/node'
import { UserService } from '../../services/user.service'
import { ApiService } from '../../services/api.service';
import { MediaQueryService } from '../../services/media-query.service'
import { ColumnDef, ColumnSelectorComponent, ColumnSelectorInput, ColumnSelectorResult }
  from '../../shared-components/column-selector/column-selector.component'
import { CommanderComponent } from '../commander/commander.component'

@Component({
  selector: 'app-node-list',
  templateUrl: './node-list.component.html',
  styleUrls: ['./node-list.component.scss']
})
export class NodeListComponent implements OnInit, OnDestroy {
  readonly columns: ColumnDef[] = Node.properties;

  dataSource: MatTableDataSource<Node> = new MatTableDataSource();

  selection = new SelectionModel<Node>(true);

  private static readonly defaultSelectedColumns = ['Id', 'Name', 'State', 'Reachable', 'NodeGroups'];

  private userOptions = this.userService.userOptions.nodeOptions;

  private get selectedColumns(): string[] {
    return this.userOptions.selectedColumns || NodeListComponent.defaultSelectedColumns;
  }

  private set selectedColumns(value: string[]) {
    this.userOptions.selectedColumns = value;
    this.userService.saveUserOptions();
  }

  get displayedColumns(): string[] {
    return ['Select'].concat(this.selectedColumns);
  }

  orderBy: string = "Id";

  asc: boolean = false;

  rowCount: number;

  readonly pageSizeOptions = [25, 50, 100, 200, 500];

  pageSize: number = this.pageSizeOptions[0];

  pageIndex: number = 0;

  private get startRow(): number {
    return this.pageIndex * this.pageSize;
  }

  private updateInterval = 1200;

  private updateExpiredIn = 36 * 1000;

  private subscription: Subscription = new Subscription();

  private dataSubscription: Subscription;

  private loadingData: boolean = false;

  get isLoading(): boolean {
    return this.loadingData;
  }

  private get actionListHidden(): boolean {
    return this.userOptions.hideActionList !== undefined ? this.userOptions.hideActionList :
      (this.mediaQuery.smallWidth ? true: false);
  }

  private set actionListHidden(val: boolean) {
    this.userOptions.hideActionList = val;
    this.userService.saveUserOptions();
  }

  @ViewChild(MatSidenavContainer, { static: false })
  private sidenavContainer: MatSidenavContainer;

  @ViewChild(MatSort, {static: true})
  private sort: MatSort;

  private nodeGroup: string;

  get noPagination(): boolean {
    return !!this.nodeGroup;
  }

  constructor(
    private route: ActivatedRoute,
    private mediaQuery: MediaQueryService,
    private api: ApiService,
    private userService: UserService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.dataSource.sort = this.sort;
    this.route.paramMap.subscribe(map => {
      this.nodeGroup = map.get('group');
      this.refresh();
    });
  }

  ngOnDestroy(): void {
    this.reset();
  }

  private getNodesInGroup(): void {
    this.loadingData = true;
    this.dataSubscription = this.api.getNodesOfGroup(this.nodeGroup).pipe(
      mergeMap(names => this.api.getNodes(null, names.join(',')))
    ).subscribe(
      data => {
        this.loadingData = false;
        this.rowCount = data.length;
        let nodes = data.map(e => Node.fromProperties(e.Properties));
        this.dataSource.data = nodes;
      },
      error => {
        this.loadingData = false;
        console.log(error);
      }
    );
  }

  private getNodes(): void {
    if (this.loadingData) {
      this.dataSubscription.unsubscribe();
    }
    this.loadingData = true;
    this.dataSubscription = this.api.getNodes(null, null, null, null, this.orderBy, this.asc, this.startRow, this.pageSize, null, 'response').subscribe({
      next: res => {
        this.loadingData = false;
        this.rowCount = Number(res.headers.get('x-ms-row-count'));
        let nodes = res.body.map(e => Node.fromProperties(e.Properties));
        this.dataSource.data = nodes;
      },
      error: err => {
        this.loadingData = false;
        console.log(err);
      }
    });
  }

  private loadData(): void {
    if (this.nodeGroup) {
      this.getNodesInGroup();
    }
    else {
      this.getNodes();
    }
  }

  onPageChange(e: PageEvent): void {
    console.log(e);
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.refresh();
  }

  onSortChange(e: Sort): void {
    console.log(e);
    this.orderBy = e.active;
    this.asc = (e.direction == "asc");
    if (!this.noPagination && this.pageSize < this.rowCount) {
      this.refresh();
    }
  }

  private reset(): void {
    if (this.loadingData) {
      this.dataSubscription.unsubscribe();
    }
    this.loadingData = false;
    this.dataSubscription = null;

    //TODO: Use separate subscriptions for loading and updating and don't unsubscribe the updating one on reset?
    this.subscription.unsubscribe();
    //When a subscription is unsubscribed, new subscription added to it won't work.
    //So a new subscription instance is required.
    this.subscription = new Subscription();
    this.selection.clear();
    this.dataSource.data = [];
  }

  //TODO: let browser refresh instead?
  refresh(): void {
    this.reset();
    this.loadData();
  }

  columnText(row: any, column: string): string {
    let v = row[column];
    if (v instanceof Date) {
      return `${v.getFullYear()}/${v.getMonth() + 1}/${v.getDate()} ${v.getHours()}:${v.getMinutes()}:${v.getSeconds()}`
    }
    if (v instanceof Array) {
      return v.join(', ');
    }
    return v;
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

  private updateNodes(nodes: Node[]): void {
    let pairs: [number, Node][] = nodes.map(n => [n.Id, n]);
    let idToNode = new Map<number, Node>(pairs);
    for (let node of this.dataSource.data) {
      let update = idToNode.get(node.Id);
      if (update) {
        node.update(update)
      }
    }
  }

  bringOnline(): void {
    let names = this.selection.selected.map(node => node.Name);
    let sub = this.api.bringNodesOnlineAndWatch(names, this.updateInterval, this.updateExpiredIn).subscribe({
      next: (nodes) => {
        this.updateNodes(nodes);
      }
    });
    this.subscription.add(sub);
  }

  takeOffline(): void {
    let names = this.selection.selected.map(node => node.Name);
    let sub = this.api.takeNodesOfflineAndWatch(names, this.updateInterval, this.updateExpiredIn).subscribe({
      next: (nodes) => {
        this.updateNodes(nodes);
      }
    });
    this.subscription.add(sub);
  }

  showColumnSelector(): void {
    let data: ColumnSelectorInput = { selected: this.selectedColumns, columns: this.columns };
    let dialogRef = this.dialog.open(ColumnSelectorComponent, { data })
    dialogRef.afterClosed().subscribe((result: undefined | ColumnSelectorResult) => {
      if (result) {
        this.selectedColumns = result.selected;
      }
    });
  }

  get isActionListHidden(): boolean {
    return this.actionListHidden;
  }

  toggleActionList(): void {
    this.actionListHidden = !this.actionListHidden;
    setTimeout(() => this.sidenavContainer.updateContentMargins(), 0);
  }

  get toggleActionListIcon(): string {
    return this.actionListHidden ? 'keyboard_arrow_left' : 'keyboard_arrow_right';
  }

  runCommand(): void {
    let nodeNames = this.selection.selected.map(node => node.Name);
    let dialogRef = this.dialog.open(CommanderComponent, { data: nodeNames, disableClose: true, minWidth: '50%' });
  }

  get adminView(): boolean {
    return this.userService.user.isAdmin;
  }
}
