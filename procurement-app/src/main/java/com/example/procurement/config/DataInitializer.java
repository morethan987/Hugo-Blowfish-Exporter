package com.example.procurement.config;

import com.example.procurement.model.Role;
import com.example.procurement.model.User;
import com.example.procurement.repository.RoleRepository;
import com.example.procurement.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initUsers(UserRepository userRepository,
                                       RoleRepository roleRepository,
                                       PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.findByUsername("admin").isEmpty()) {
                Role adminRole = roleRepository.findById("ROLE_ADMIN")
                        .orElseGet(() -> roleRepository.save(new Role("ROLE_ADMIN")));
                User admin = new User();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.getRoles().add(adminRole);
                userRepository.save(admin);
            }
        };
    }
}
