import { Injectable } from '@angular/core';
import axios from 'axios';
import { environment } from '../environments/environments';


@Injectable({
  providedIn: 'root'
})
export class AppService {

  private apiUrl = environment.apiUrl
  private teleToken = environment.telegramToken
  private teleChatId = environment.telegramChatId

  constructor() { }

  async getData(query: string) {
    return await axios.get(`${this.apiUrl}query?query=${query}`).then(
      async response => {
        return response.data
      }).catch(
        async error => {
          console.error(error);
        }
      )
  }

  async getAvgData(query: string, start: any, end: any): Promise<any> {
    return await axios.get(`${this.apiUrl}query_range`, {
      params: {
        query: query,
        start: start,
        end: end,
        step: '1h'
      }
    }).then(
      async response => {
        return this.calculateAverage(response.data)
      }).catch(
        async error => {
          console.error(error);
        }
      )

  }

  private calculateAverage(data: any): any {
    const servers = data.data.result;
    const averages = servers.map((server: any) => {
      const values = server.values.map((val: any) => parseFloat(val[1]));
      const total = values.reduce((acc: number, curr: number) => acc + curr, 0);
      const average = total / values.length;
      return {
        instance: server.metric.instance,
        average: average
      };
    });
    return averages;
  }

  async sendMessage(message: string) {
    const data = {
      chat_id: this.teleChatId,
      text: message,
    };

    return await axios.post(`https://api.telegram.org/bot${this.teleToken}/sendMessage`, data).then(
      async response => {
        return response.data
      }).catch(
        async error => {
          console.error(error);
        }
      )
  }
}
