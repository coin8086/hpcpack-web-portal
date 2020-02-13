import { RestProperty } from '../services/api.service'

export class Node {
  Availability: string;
  AzureServiceName: string;
  CpuSpeed: number;
  DnsSuffix: string;
  Guid: string;
  Id: number;
  JobType: string;
  Location: string;
  MemorySize: number;
  Name: string;
  NodeGroups: string;
  NumCores: number;
  NumSockets: number;
  OfflineTime: Date;
  OnlineTime: Date;
  Reachable: boolean;
  State: string;

  update(other: Node): void {
    for (let prop of Node.properties) {
      (this as any)[prop.name] = (other as any)[prop.name];
    }
  }

  static readonly properties = [
    { name: 'Availability', label: 'Availability', type: String },
    { name: 'AzureServiceName', label: 'AzureService Name', type: String },
    { name: 'CpuSpeed', label: 'Cpu Speed', type: Number },
    { name: 'DnsSuffix', label: 'Dns Suffix', type: String },
    { name: 'Guid', label: 'Guid', type: String },
    { name: 'Id', label: 'Id', type: Number },
    { name: 'JobType', label: 'Job Type', type: String },
    { name: 'Location', label: 'Location', type: String },
    { name: 'MemorySize', label: 'Memory Size', type: Number },
    { name: 'Name', label: 'Name', type: String },
    { name: 'NodeGroups', label: 'Node Groups', type: String },
    { name: 'NumCores', label: 'Cores', type: Number },
    { name: 'NumSockets', label: 'Sockets', type: Number },
    { name: 'OfflineTime', label: 'Offline Time', type: Date },
    { name: 'OnlineTime', label: 'Online Time', type: Date },
    { name: 'Reachable', label: 'Reachable', type: Boolean },
    { name: 'State', label: 'State', type: String },
  ];

  static readonly propertyMap = new Map(Node.properties.map(p => [p.name, p]));

  static fromProperties(properties: Array<RestProperty>): Node {
    let node = new Node();
    for (let prop of properties) {
      let p = Node.propertyMap.get(prop.Name);
      if (p && prop.Value !== '') {
        let value;
        if (p.type == Date) {
          value = prop.Value + ' UTC';
        }
        else {
          value = prop.Value;
        }
        (node as any)[p.name] = new p.type(value);
      }
    }
    return node;
  }
}
