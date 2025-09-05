package com.example.procurement.service;

import com.example.procurement.model.PurchaseRecord;
import com.example.procurement.repository.PurchaseRecordRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PurchaseService {

    private final PurchaseRecordRepository repository;
    private final Path uploadDir = Paths.get("uploads");

    public PurchaseService(PurchaseRecordRepository repository) throws IOException {
        this.repository = repository;
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }
    }

    public void savePurchase(String itemName, BigDecimal price, String link,
                             LocalDate date, MultipartFile file, String username) throws IOException {
        String newFileName = itemName + "_" + price + "_" + date + "_" + username + ".pdf";
        Files.copy(file.getInputStream(), uploadDir.resolve(newFileName), StandardCopyOption.REPLACE_EXISTING);

        PurchaseRecord record = new PurchaseRecord();
        record.setItemName(itemName);
        record.setPrice(price);
        record.setLink(link);
        record.setPurchaseDate(date);
        record.setPurchaser(username);
        record.setInvoiceFileName(newFileName);
        repository.save(record);
    }

    public long sumByUser(String username) {
        return repository.findAll().stream()
                .filter(r -> r.getPurchaser().equals(username))
                .mapToLong(r -> r.getPrice().longValue()).sum();
    }

    public List<PurchaseRecord> findByUser(String username) {
        return repository.findAll().stream()
                .filter(r -> r.getPurchaser().equals(username))
                .sorted(Comparator.comparing(PurchaseRecord::getPurchaseDate).reversed())
                .collect(Collectors.toList());
    }
}
