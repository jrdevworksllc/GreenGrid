package com.greengrid.backendapi.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path rootPath;

    public FileStorageService(@Value("${greengrid.storage.root}") String root) throws IOException {
        this.rootPath = Path.of(root).toAbsolutePath().normalize();
        Files.createDirectories(this.rootPath);
    }

    public List<String> saveAll(List<MultipartFile> files) throws IOException {
        List<String> saved = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            String safeName = UUID.randomUUID() + "-" + file.getOriginalFilename();
            Path destination = rootPath.resolve(safeName);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            saved.add(destination.toString());
        }
        return saved;
    }
}
