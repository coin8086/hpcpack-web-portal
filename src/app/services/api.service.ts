import { Injectable, Optional, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subscriber } from 'rxjs'
import { DefaultService, BASE_PATH, Configuration } from '../api-client'
import { Node } from '../models/node'
import { Job } from '../models/job'
import { ILooper, Looper } from './looper.service'

export * from '../api-client'

@Injectable({
  providedIn: 'root'
})
export class ApiService extends DefaultService {
  constructor(
    httpClient: HttpClient,
    @Optional() @Inject(BASE_PATH) basePath: string,
    @Optional() configuration: Configuration
  ) {
    super(httpClient, basePath, configuration);
  }

  doNodeOperationAndWatch(operation: 'online' | 'offline', targetState: string, nodeNames: string[], updateInterval: number, updateExpiredIn: number): Observable<Node[]> {
    return new Observable<Node[]>(subscriber => {
      this.operateNodes(operation, nodeNames).subscribe(_ => {
        let looper = Looper.start(
          this.getNodes(null, nodeNames.join(',')),
          {
            next: (data, looper) => {
              let nodes = data.map(e => Node.fromProperties(e.Properties));
              subscriber.next(nodes);

              //Check target status and filter out nodes that needs further check.
              let names: string[] = [];
              for (let node of nodes) {
                if (node.State !== targetState) {
                  names.push(node.Name);
                }
              }

              //Do next query or finish.
              if (names.length == 0) {
                looper.stop();
              }
              else {
                looper.observable = this.getNodes(null, names.join(','));
              }
            },
            stop: () => {
              subscriber.complete();
            }
          },
          updateInterval,
          updateExpiredIn
        );
        return () => looper.stop();
      });
    });
  }

  bringNodesOnlineAndWatch(names: string[], updateInterval: number, updateExpiredIn: number): Observable<Node[]> {
    return this.doNodeOperationAndWatch('online', 'Online', names, updateInterval, updateExpiredIn);
  }

  takeNodesOfflineAndWatch(names: string[], updateInterval: number, updateExpiredIn: number): Observable<Node[]> {
    return this.doNodeOperationAndWatch('offline', 'Offline', names, updateInterval, updateExpiredIn);
  }

  doJobOperationAndWatch(operation: Observable<any>, jobId: number, updateInterval: number, updateExpiredIn: number): Observable<Job> {
    return new Observable<Job>(subscriber => {
      operation.subscribe(_ => {
        let looper = Looper.start(
          this.getJob(jobId),
          {
            next: (data, looper) => {
              let job = Job.fromProperties(data);
              subscriber.next(job);

              if (job.Ended) {
                looper.stop();
              }
            },
            stop: () => {
              subscriber.complete();
            }
          },
          updateInterval,
          updateExpiredIn
        );
        return () => looper.stop();
      });
    });
  }

  requeueJobAndWatch(jobId: number, updateInterval: number, updateExpiredIn: number): Observable<Job> {
    return this.doJobOperationAndWatch(this.requeueJob(jobId), jobId, updateInterval, updateExpiredIn);
  }

  submitJobAndWatch(jobId: number, updateInterval: number, updateExpiredIn: number): Observable<Job> {
    return this.doJobOperationAndWatch(this.submitJob(jobId), jobId, updateInterval, updateExpiredIn);
  }

  cancelJobAndWatch(jobId: number, updateInterval: number, updateExpiredIn: number): Observable<Job> {
    return this.doJobOperationAndWatch(this.cancelJob(jobId), jobId, updateInterval, updateExpiredIn);
  }

  finishJobAndWatch(jobId: number, updateInterval: number, updateExpiredIn: number): Observable<Job> {
    return this.doJobOperationAndWatch(this.finishJob(jobId), jobId, updateInterval, updateExpiredIn);
  }
}