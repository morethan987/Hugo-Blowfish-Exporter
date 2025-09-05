package com.example.procurement.service;

import com.example.procurement.model.PurchaseRecord;
import com.example.procurement.repository.PurchaseRecordRepository;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;

@Service
public class ExportService {

    private final PurchaseRecordRepository repository;

    public ExportService(PurchaseRecordRepository repository) {
        this.repository = repository;
    }

    public void exportAll(HttpServletResponse response) throws IOException {
        List<PurchaseRecord> records = repository.findAll();
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Purchases");

        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("Item");
        header.createCell(1).setCellValue("Price");
        header.createCell(2).setCellValue("Date");
        header.createCell(3).setCellValue("Purchaser");

        int rowIdx = 1;
        for (PurchaseRecord r : records) {
            Row row = sheet.createRow(rowIdx++);
            row.createCell(0).setCellValue(r.getItemName());
            row.createCell(1).setCellValue(r.getPrice().doubleValue());
            row.createCell(2).setCellValue(r.getPurchaseDate().toString());
            row.createCell(3).setCellValue(r.getPurchaser());
        }

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=purchases.xlsx");
        workbook.write(response.getOutputStream());
        workbook.close();
    }
}
