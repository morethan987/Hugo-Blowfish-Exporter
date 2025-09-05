package com.example.procurement.model;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
public class PurchaseRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String itemName;
    private BigDecimal price;
    private String link;
    private LocalDate purchaseDate;
    private String purchaser;
    private String invoiceFileName;

    // getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getItemName() { return itemName; }
    public void setItemName(String itemName) { this.itemName = itemName; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }
    public LocalDate getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(LocalDate purchaseDate) { this.purchaseDate = purchaseDate; }
    public String getPurchaser() { return purchaser; }
    public void setPurchaser(String purchaser) { this.purchaser = purchaser; }
    public String getInvoiceFileName() { return invoiceFileName; }
    public void setInvoiceFileName(String invoiceFileName) { this.invoiceFileName = invoiceFileName; }
}
