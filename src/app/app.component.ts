import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppService } from './app.service';
import { CommonModule } from '@angular/common';
import { Form, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  Form!: FormGroup

  cpuUsage: any = [];
  DataCpuAvg: any = []

  query: any;
  startDate: any;
  endDate: any

  ramUsage: any = [];
  diskUsage: any = [];
  uptime: any = [];

  networkUsage: any = [];
  dataAvgNetwork: any = []

  ssl: any = []
  tableHeight: number = 0;
  currentDate: any;

  constructor(private dataService: AppService, private fb: FormBuilder) {
    this.currentDate = new Date().toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  async getCpuUsage() {
    const data = await this.dataService.getData('(sum by(instance) (irate(node_cpu_seconds_total{job="server AWH", mode!="idle"}[5m])) / on(instance) group_left sum by (instance)((irate(node_cpu_seconds_total{job="server AWH"}[5m])))) * 100');
    if (data.status === 'success') {
      this.cpuUsage = data.data.result.map((item: any) => ({
        instance: item.metric.instance,
        usage: parseFloat(item.value[1])
      }));
    } else {
      alert("ERROR FETCH DATA");
    }
  }

  async getAvgCpu() {
    this.query = '(sum by(instance) (irate(node_cpu_seconds_total{job="server AWH", mode!="idle"}[5m])) / on(instance) group_left sum by (instance) ((irate(node_cpu_seconds_total{job="server AWH"}[5m])))) * 100'
    this.startDate = '2024-10-14T12:00:00Z'
    this.endDate = '2024-10-15T12:00:00Z'

    this.DataCpuAvg = await this.dataService.getAvgData(this.query, this.startDate, this.endDate)
    console.log(this.DataCpuAvg)
  }

  async getAvgRam() {
    this.query = '100 - ((avg_over_time(node_memory_MemAvailable_bytes{job="server AWH"}[5m]) * 100) / avg_over_time(node_memory_MemTotal_bytes{job="server AWH"}[5m]))'
    this.startDate = '2024-10-13T12:00:00Z'
    this.endDate = '2024-10-15T12:00:00Z'


    console.log(await this.dataService.getAvgData(this.query, this.startDate, this.endDate))
  }

  async getRamUsage() {
    const data = await this.dataService.getData('100 - ((avg_over_time(node_memory_MemAvailable_bytes{job="server AWH"}[5m]) * 100) / avg_over_time(node_memory_MemTotal_bytes{job="server AWH"}[5m]))');
    if (data.status === 'success') {
      this.ramUsage = data.data.result.map((item: any) => ({
        instance: item.metric.instance,
        usage: parseFloat(item.value[1])
      }));
    } else {
      alert("ERROR FETCH DATA");
    }
  }

  async getDiskUsage() {
    const data = await this.dataService.getData('100 - ((avg_over_time(node_filesystem_avail_bytes{job="server AWH",mountpoint="/",fstype!="rootfs"}[5m]) * 100) / avg_over_time(node_filesystem_size_bytes{job="server AWH",mountpoint="/",fstype!="rootfs"}[5m]))');
    if (data.status === 'success') {
      this.diskUsage = data.data.result.map((item: any) => ({
        instance: item.metric.instance,
        usage: parseFloat(item.value[1])
      }));
    } else {
      alert("ERROR FETCH DATA");
    }
  }

  async getNetworkUsage() {
    const downloadData = await this.dataService.getData('irate(node_network_receive_bytes_total{job="server AWH",device="ens5"}[5m])*8');
    const uploadData = await this.dataService.getData('irate(node_network_transmit_bytes_total{job="server AWH",device="ens5"}[5m])*8');

    if (downloadData.status === 'success' && uploadData.status === 'success') {
      this.networkUsage = downloadData.data.result.map((item: any) => {
        const instance = item.metric.instance;
        const download = parseFloat(item.value[1]) / (1024 * 1024);
        const uploadDataItem = uploadData.data.result.find((uploadItem: any) => uploadItem.metric.instance === instance);
        const upload = uploadDataItem ? parseFloat(uploadDataItem.value[1]) / (1024 * 1024) : 0;

        return {
          instance: instance,
          download: download,
          upload: upload,
          totalUsage: download + upload
        };
      });
    } else {
      alert("ERROR FETCH DATA");
    }
  }

  async getAvgNetwork() {
    const queryDownload = 'irate(node_network_receive_bytes_total{job="server AWH",device="ens5"}[5m])*8';
    const queryUpload = 'irate(node_network_transmit_bytes_total{job="server AWH", device="ens5"}[5m])*8';

    this.startDate = '2024-10-14T12:00:00Z';
    this.endDate = '2024-10-15T12:00:00Z';

    const dataDownload = await this.dataService.getAvgData(queryDownload, this.startDate, this.endDate);
    const dataUpload = await this.dataService.getAvgData(queryUpload, this.startDate, this.endDate);

    // Gabungkan data download dan upload berdasarkan instance
    const mergedData = dataDownload.map((download: any) => {
      // Cari instance yang cocok di data upload
      const upload = dataUpload.find((upload: any) => upload.instance === download.instance);

      return {
        instance: download.instance,
        downloadAverage: download.average,
        uploadAverage: upload ? upload.average : 0
      };
    });

    console.log('Merged Data:', mergedData);
  }

  async getUptime() {
    const data = await this.dataService.getData('node_time_seconds{job="server AWH"} - node_boot_time_seconds{job="server AWH"}');
    if (data.status === 'success') {
      this.uptime = data.data.result.map((item: any) => ({
        instance: item.metric.instance,
        usage: this.convertUptime(parseFloat(item.value[1]))
      }));
    } else {
      alert("ERROR FETCH DATA");
    }
  }

  async getSSL() {
    const data = await this.dataService.getData('probe_ssl_earliest_cert_expiry');
    if (data.status === 'success') {
      this.ssl = data.data.result.map((item: any) => ({
        instance: item.metric.instance,
        expiryDate: this.convertEpochToDate(parseFloat(item.value[1]))
      }));
    } else {
      alert("ERROR FETCH DATA");
    }
  }

  convertEpochToDate(epochTime: number): string {
    const date = new Date(epochTime * 1000);
    return date.toISOString().slice(0, 19).replace("T", " ");
  }

  convertUptime(seconds: number): string {
    const years = Math.floor(seconds / (365 * 24 * 3600)); // 1 tahun
    seconds %= 365 * 24 * 3600;

    const months = Math.floor(seconds / (30 * 24 * 3600)); // 1 bulan
    seconds %= 30 * 24 * 3600;

    const days = Math.floor(seconds / (24 * 3600)); // 1 hari
    seconds %= 24 * 3600;

    const hours = Math.floor(seconds / 3600); // 1 jam
    seconds %= 3600;

    const minutes = Math.floor(seconds / 60); // 1 menit
    const secs = Math.floor(seconds % 60); // 1 detik

    return `${years} Tahun ${months} Bulan ${days} hari ${hours} Jam ${minutes} Menit`;
  }



  ngOnInit() {
    this.Form = this.fb.group({
      shift: ['', Validators.required],
      issue: ['', Validators.required],
      ticket: ['', Validators.required],
      activity: ['', Validators.required],
      reminder: ['', Validators.required],
    })

    this.getCpuUsage();
    this.getRamUsage();
    this.getDiskUsage();
    this.getUptime();
    this.getNetworkUsage()
    this.getSSL();
    this.getAvgCpu()
    this.getAvgNetwork()
    this.getAvgRam()
  }

  getAvgCpuForInstance(instance: string): number {
    const cpuData = this.DataCpuAvg.find((r: any) => r.instance === instance)
    return cpuData ? cpuData.average : 0
  }

  getDiskUsageForInstance(instance: string): number {
    const diskData = this.diskUsage.find((r: any) => r.instance === instance);
    return diskData ? diskData.usage : 0;
  }

  getRamUsageForInstance(instance: string): number {
    const ramData = this.ramUsage.find((r: any) => r.instance === instance);
    return ramData ? ramData.usage : 0;
  }

  getUptimeForInstance(instance: string): string {
    const uptimeData = this.uptime.find((r: any) => r.instance === instance);
    return uptimeData ? uptimeData.usage : 'Data tidak tersedia';
  }

  getNetworkUsageForInstance(instance: string): { download: number; upload: number } {
    const networkData = this.networkUsage.find((r: any) => r.instance === instance);
    return networkData ? { download: networkData.download, upload: networkData.upload } : { download: 0, upload: 0 };
  }

  async sendTele() {
    try {
      if (this.Form.valid) {
        const header = `REPORT ACTIVITY SYSNET\n` +
          `Periode: ${this.currentDate}\n` +
          `Shift: ${this.Form.value.shift}\n\n` +
          `Issue/Request from Internal:\n` +
          `${this.Form.value.issue || 'N/A'}\n\n` +
          `Ticketing Open:\n` +
          `${this.Form.value.ticket || 'N/A'}\n\n` +
          `Activity:\n` +
          `${this.Form.value.activity || 'N/A'}\n\n` +
          `Reminder:\n` +
          `${this.Form.value.reminder || 'N/A'}\n\n` +
          `Daily Activity\n` +
          `*Data All Server:*\n`;

        // Loop hanya untuk mendapatkan informasi dari cpuUsage
        const messageLines = this.cpuUsage.map((usage: any, index: number) => {
          const networkReceive = this.getNetworkUsageForInstance(usage.instance).download;
          const networkTransmit = this.getNetworkUsageForInstance(usage.instance).upload;
          const totalNetworkUsage = networkReceive + networkTransmit;

          const ramUsage = this.getRamUsageForInstance(usage.instance)?.toFixed(1) || 'N/A';
          const diskUsage = this.getDiskUsageForInstance(usage.instance)?.toFixed(1) || 'N/A';
          const uptime = this.getUptimeForInstance(usage.instance) || 'N/A';

          return `${index + 1}. ${usage.instance}\n` +
            `   - CPU Used: ${usage.usage.toFixed(1)}%\n` +
            `   - RAM Used: ${ramUsage}%\n` +
            `   - Total Network Usage: ${(totalNetworkUsage).toFixed(1)} MB/s\n` +
            `   - Disk Usage: ${diskUsage}%\n` +
            `   - Uptime: ${uptime}\n\n`;
        });

        await this.getSSL(); // Pastikan SSL sudah diambil sebelum digunakan

        // Format pesan SSL
        const sslLines = this.ssl.map((sslData: any, index: number) => {
          const daysLeft = this.calculateDaysLeft(sslData.expiryDate); // Menghitung sisa hari
          const expiryMessage = daysLeft > 0
            ? `SSL akan kedaluwarsa dalam ${daysLeft} hari.\n`
            : `SSL telah kadaluwarsa.\n`;

          return `${index + 1}. ${sslData.instance}\n` +
            `   - ${expiryMessage}` +
            `   - SSL Expiry: ${sslData.expiryDate}\n\n`;
        });

        // Gabungkan bagian header dengan messageLines dan sslLines
        const formattedMessage = header + messageLines.join('') +
          `*Masa Tenggang SSL:*\n` + sslLines.join('');

        // Kirim pesan dengan parse_mode
        try {
          const data = await this.dataService.sendMessage(formattedMessage);
          console.log(data);
          if (data.ok) {
            Swal.fire({
              title: "Pesan Berhasil dikirim !",
              text: "Pesan berhasil dikirim melalui telegram !",
              icon: "success"
            });
          }
        } catch (error) {
          console.error("Error sending message:", error);
          Swal.fire({
            title: "Mengirim Pesan Gagal!",
            text: "Pesan gagal dikirimkan melalui Telegram!",
            icon: "error"
          });
        }
      } else {
        Swal.fire({
          title: "Form tidak valid!",
          text: "Harap lengkapi semua kolom yang diperlukan.",
          icon: "error"
        });
      }
    } catch (error) {
      console.error("Error in sendTele:", error); // Log kesalahan
      Swal.fire({
        title: "Mengirim Pesan Gagal!",
        text: "Pesan gagal dikirimkan melalui Telegram!",
        icon: "error"
      });
    }
  }


  // Fungsi untuk menghitung sisa hari hingga kedaluwarsa
  calculateDaysLeft(expiryDateStr: any) {
    const expiryDate: any = new Date(expiryDateStr);
    const currentDate: any = new Date();
    const timeDifference = expiryDate - currentDate;
    return Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  }


  generatePDF() {
    try {
      if (this.Form.valid) {
        this.createPdf(); // Panggil metode untuk membuat PDF
        Swal.fire({
          title: "Laporan Berhasil Dicetak !",
          text: "Pesan sudah dicetak menjadi PDF !",
          icon: "success"
        });
      } else {
        Swal.fire({
          title: "Form tidak valid!",
          text: "Harap lengkapi semua kolom yang diperlukan.",
          icon: "error"
        });
      }
    } catch (error) {
      Swal.fire({
        title: "Laporan Gagal Dicetak !",
        text: "Terjadi kesalahan saat mencetak laporan menjadi PDF.",
        icon: "error"
      });
      console.error("Error generating PDF:", error); // Log kesalahan di konsol untuk debugging
    }
  }


  async createPdf() {
    const doc = new jsPDF();

    doc.setFont('normal');

    // Menambahkan judul
    doc.setFontSize(14);
    doc.text('REPORT ACTIVITY SYSNET', 10, 20);

    // Menambahkan informasi periode dan shift
    doc.setFontSize(10);
    doc.text(`Periode: ${this.currentDate}`, 10, 25);
    doc.text(`Shift: ${this.Form.value.shift}`, 10, 30);

    // Menambahkan judul untuk Daily Activity
    doc.setFontSize(12);
    doc.text('Daily Activity', 10, 40);

    // Menambahkan subjudul untuk Data All Server
    doc.setFontSize(12);
    doc.text('Data All Server:', 10, 45);

    let currentY = 50;

    this.cpuUsage.forEach((usage: any, index: any) => {
      const networkReceive = this.getNetworkUsageForInstance(usage.instance).download;
      const networkTransmit = this.getNetworkUsageForInstance(usage.instance).upload;
      const totalNetworkUsage = networkReceive + networkTransmit;

      const ramUsage = this.getRamUsageForInstance(usage.instance)?.toFixed(1) || 'N/A';
      const diskUsage = this.getDiskUsageForInstance(usage.instance)?.toFixed(1) || 'N/A';
      const uptime = this.getUptimeForInstance(usage.instance) || 'N/A';

      doc.setFontSize(10);
      if (currentY > 260) {
        doc.addPage();
        currentY = 10;
      }
      doc.text(`${index + 1}. ${usage.instance}`, 10, currentY);
      currentY += 5; // Jarak antar baris
      doc.text(`   - CPU Used: ${usage.usage.toFixed(1)}%`, 10, currentY);
      currentY += 5;
      doc.text(`   - RAM Used: ${ramUsage}%`, 10, currentY);
      currentY += 5;
      doc.text(`   - Total Network Usage: ${totalNetworkUsage.toFixed(1)} MB/s`, 10, currentY);
      currentY += 5;
      doc.text(`   - Disk Usage: ${diskUsage} %`, 10, currentY);
      currentY += 5;
      doc.text(`   - Uptime: ${uptime}`, 10, currentY);
      currentY += 10;
    });

    doc.setFontSize(12);
    if (currentY > 260) {
      doc.addPage();
      currentY = 10;
    }
    doc.text('*Masa Tenggang SSL:*', 10, currentY);
    currentY += 5;

    this.ssl.forEach((ssl: any, index: any) => {
      const expiryDateStr = ssl.expiryDate;
      const expiryDate: any = new Date(expiryDateStr);
      const currentDate: any = new Date();

      const timeDifference = expiryDate - currentDate;
      const daysLeft = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

      if (currentY > 260) {
        doc.addPage();
        currentY = 10;
      }
      doc.setFontSize(10);

      doc.text(`${index + 1}. ${ssl.instance}`, 10, currentY);
      currentY += 5;
      if (daysLeft > 0) {
        doc.text(`   - SSL akan kedaluwarsa dalam ${daysLeft} hari.`, 10, currentY);
        currentY += 5;
        doc.text(`   - SSL Expiry: ${ssl.expiryDate}`, 10, currentY);
        currentY += 10;
      } else {
        doc.text(`   - SSL telah kadaluwarsa.`, 10, currentY);
        currentY += 5;
        doc.text(`   - SSL Expiry: ${ssl.expiryDate}`, 10, currentY);
        currentY += 10;
      }
    });

    // Menambahkan issue, ticketing, activity, reminder
    const sections = [
      { title: "Issue/Request from Internal:", value: this.Form.value.issue },
      { title: "Ticketing Open:", value: this.Form.value.ticket },
      { title: "Activity:", value: this.Form.value.activity },
      { title: "Reminder:", value: this.Form.value.reminder },
    ];

    sections.forEach(section => {
      if (currentY > 260) {
        doc.addPage();
        currentY = 10;
      }
      doc.setFontSize(12);
      doc.text(section.title, 10, currentY);
      currentY += 5;

      const textLines = doc.splitTextToSize(section.value || 'N/A', 190);
      doc.setFontSize(10);
      doc.text(textLines, 10, currentY);
      currentY += (textLines.length + 1) * 5;
    });

    doc.save(`Laporan_Penggunaan_Server.pdf`);
  }

}
