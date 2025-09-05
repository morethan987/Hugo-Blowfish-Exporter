package com.example.procurement.controller;

import com.example.procurement.service.PurchaseService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.security.Principal;
import java.time.LocalDate;

@Controller
public class PurchaseController {

    private final PurchaseService purchaseService;

    public PurchaseController(PurchaseService purchaseService) {
        this.purchaseService = purchaseService;
    }

    @PostMapping("/user/purchase")
    public String submitPurchase(@RequestParam String itemName,
                                 @RequestParam BigDecimal price,
                                 @RequestParam(required = false) String link,
                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate purchaseDate,
                                 @RequestParam("file") MultipartFile file,
                                 Principal principal) throws IOException {
        purchaseService.savePurchase(itemName, price, link, purchaseDate, file, principal.getName());
        return "redirect:/user/home";
    }

    @GetMapping("/user/home")
    public String userHome(Model model, Principal principal) {
        String username = principal.getName();
        model.addAttribute("records", purchaseService.findByUser(username));
        model.addAttribute("totalValue", purchaseService.sumByUser(username));
        return "user/home";
    }
}
